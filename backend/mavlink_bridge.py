#!/usr/bin/env python3

from pymavlink import mavutil
import json
import socket
import time
import math
import sys
import threading
import firebase_admin
from firebase_admin import credentials, firestore

# Loglama fonksiyonu
def log(message, error=False):
    timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
    output = f"[{timestamp}] {message}"
    if error:
        print(output, file=sys.stderr)
    else:
        print(output)
    sys.stdout.flush()

# UDP bağlantısı oluştur (Node.js ile haberleşmek için)
nodejs_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
nodejs_address = ('127.0.0.1', 14552)  # Node.js bu portu dinleyecek

log("UDP soketi oluşturuldu")

# Komutları dinlemek için yeni UDP soketi
command_socket = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
command_address = ('127.0.0.1', 14553)
try:
    command_socket.bind(command_address)
    command_socket.setblocking(False)
    log(f"Komut dinleme soketi {command_address} portunda başlatıldı")
except Exception as e:
    log(f"Komut soketi başlatılamadı: {e}", error=True)
    sys.exit(1)

# Firestore başlat
cred = credentials.Certificate('firebase-service-account.json')
firebase_admin.initialize_app(cred)
db = firestore.client()

# İki MAVLink bağlantısı aç
mav_connection1 = mavutil.mavlink_connection('/dev/ttyUSB0', baud=57600)
mav_connection2 = mavutil.mavlink_connection('/dev/ttyUSB0', baud=57600)

log("MAVLink bağlantısı 1 başlatılıyor...")
mav_connection1.wait_heartbeat()
log("MAVLink bağlantısı 1 kuruldu!")
log("MAVLink bağlantısı 2 başlatılıyor...")
mav_connection2.wait_heartbeat()
log("MAVLink bağlantısı 2 kuruldu!")

def handle_commands():
    """Node.js'den gelen komutları dinle ve işle"""
    while True:
        try:
            data, addr = command_socket.recvfrom(1024)
            if data:
                command_data = json.loads(data.decode())
                log(f"Komut alındı: {command_data}")
                
                command = command_data.get('command')
                
                if command == 'ARM':
                    mav_connection1.mav.command_long_send(
                        mav_connection1.target_system, mav_connection1.target_component,
                        mavutil.mavlink.MAV_CMD_COMPONENT_ARM_DISARM, 0,
                        1, 21196, 0, 0, 0, 0, 0)
                    log("Force ARM komutu gönderildi")
                
                elif command == 'DISARM':
                    mav_connection1.mav.command_long_send(
                        mav_connection1.target_system, mav_connection1.target_component,
                        mavutil.mavlink.MAV_CMD_COMPONENT_ARM_DISARM, 0,
                        0, 21196, 0, 0, 0, 0, 0)
                    log("Force DISARM komutu gönderildi")

                elif command == 'SET_MODE':
                    mode = command_data.get('mode')
                    if mode:
                        mode_mapping = mav_connection1.mode_mapping()
                        if mode_mapping and mode in mode_mapping:
                            mode_id = mode_mapping[mode]
                            mav_connection1.mav.set_mode_send(
                                mav_connection1.target_system,
                                mavutil.mavlink.MAV_MODE_FLAG_CUSTOM_MODE_ENABLED,
                                mode_id)
                            log(f"SET_MODE komutu gönderildi: {mode}")
                            # Senkronizasyon sorununu çözmek için durum güncellemelerini 2 sn duraklat
                            last_send_time['status'] = time.time() + 2.0
                        else:
                            log(f"Geçersiz veya desteklenmeyen mod: {mode}", error=True)

        except BlockingIOError:
            time.sleep(0.1) # Veri yoksa kısa bir süre bekle
        except Exception as e:
            log(f"Komut işleme hatası: {e}", error=True)

# Komut dinleyiciyi ayrı bir thread'de başlat
command_thread = threading.Thread(target=handle_commands, daemon=True)
command_thread.start()

log("SITL ve Mission Planner verilerini dinliyorum...")

def send_to_nodejs(data_type, data):
    try:
        message = {
            'type': data_type,
            'data': data
        }
        message_json = json.dumps(message)
        nodejs_socket.sendto(message_json.encode(), nodejs_address)
        log(f"Gönderilen {data_type} verisi: {message_json}")
        return True
    except Exception as e:
        log(f"Veri gönderme hatası: {str(e)}", error=True)
        return False

# Veri saklama ve güncelleme zamanları
last_data = {
    'position': None,
    'attitude': None,
    'battery': None,
    'status': None,
    'gps': None
}

last_send_time = {
    'position': 0,
    'attitude': 0,
    'battery': 0,
    'status': 0,
    'gps': 0
}

UPDATE_INTERVAL = 0.1  # 100ms

def should_update(data_type):
    """Veriyi güncellemeli miyiz kontrol et"""
    current_time = time.time()
    
    # Her veri tipi için minimum güncelleme aralığını kontrol et
    if current_time - last_send_time[data_type] >= UPDATE_INTERVAL:
        last_send_time[data_type] = current_time
        return True
    return False

def get_flight_mode(base_mode, custom_mode, system_status):
    """Uçuş modunu belirle"""
    try:
        armed = bool(base_mode & mavutil.mavlink.MAV_MODE_FLAG_SAFETY_ARMED)
        
        # Özel modları kontrol et
        mode_mapping = {
            0: 'STABILIZE',
            1: 'ACRO',
            2: 'ALT_HOLD',
            3: 'AUTO',
            4: 'GUIDED',
            5: 'LOITER',
            6: 'RTL',
            7: 'CIRCLE',
            8: 'POSITION',
            9: 'LAND',
            10: 'OF_LOITER',
            11: 'DRIFT',
            13: 'SPORT',
            14: 'FLIP',
            15: 'AUTOTUNE',
            16: 'POSHOLD',
            17: 'BRAKE',
            18: 'THROW',
            19: 'AVOID_ADSB',
            20: 'GUIDED_NOGPS',
            21: 'SMART_RTL',
            22: 'FLOWHOLD',
            23: 'FOLLOW',
            24: 'ZIGZAG',
            25: 'SYSTEMID',
            26: 'AUTOROTATE',
            27: 'AUTO_RTL'
        }
        
        flight_mode = mode_mapping.get(custom_mode, 'UNKNOWN')
        
        # Sistem durumunu kontrol et
        system_status_mapping = {
            0: 'UNINIT',
            1: 'BOOT',
            2: 'CALIBRATING',
            3: 'STANDBY',
            4: 'ACTIVE',
            5: 'CRITICAL',
            6: 'EMERGENCY',
            7: 'POWEROFF',
            8: 'TERMINATION'
        }
        
        status = system_status_mapping.get(system_status, 'UNKNOWN')
        
        return armed, flight_mode, status
    except Exception as e:
        log(f"Uçuş modu belirleme hatası: {str(e)}", error=True)
        return False, 'UNKNOWN', 'UNKNOWN'

def update_and_send_if_changed(data_type, new_data):
    """Veriyi güncelle ve gönder"""
    try:
        # Her zaman timestamp ekle
        new_data['timestamp'] = int(time.time() * 1000)
        
        # Veriyi her zaman gönder
        if should_update(data_type):
            last_data[data_type] = new_data.copy()
            success = send_to_nodejs(data_type.upper(), new_data)
            if success:
                log(f"{data_type} verisi başarıyla gönderildi")
            return success
        return False
    except Exception as e:
        log(f"Veri güncelleme hatası ({data_type}): {str(e)}", error=True)
        return False

def request_data_stream(mav_connection):
    """MAVLink veri akışını yapılandır"""
    try:
        # Tüm mesaj tipleri için veri akışını ayarla
        for stream_id in range(0, 6):  # MAVLink stream ID'leri
            mav_connection.mav.request_data_stream_send(
                mav_connection.target_system,
                mav_connection.target_component,
                stream_id,
                50,  # 50 Hz hızında veri
                1  # Açık
            )
        log("Veri akışı yapılandırıldı")
    except Exception as e:
        log(f"Veri akışı yapılandırma hatası: {str(e)}", error=True)

# IHA1 için veri işleme fonksiyonu

def process_iha1():
    request_data_stream(mav_connection1)
    while True:
        try:
            msg = mav_connection1.recv_match(blocking=True, timeout=1.0)
            if not msg:
                continue
            msg_dict = msg.to_dict()
            msg_type = msg.get_type()
            # Konum verisi
            if msg_type == 'GLOBAL_POSITION_INT':
                position_data = {
                    'lat': msg_dict['lat'] / 1e7,
                    'lon': msg_dict['lon'] / 1e7,
                    'alt': msg_dict['alt'] / 1000.0,
                    'relative_alt': msg_dict['relative_alt'] / 1000.0,
                    'vx': msg_dict['vx'] / 100.0,
                    'vy': msg_dict['vy'] / 100.0,
                    'vz': msg_dict['vz'] / 100.0,
                    'hdg': msg_dict['hdg'] / 100.0,
                    'ground_speed': math.sqrt((msg_dict['vx']/100.0)**2 + (msg_dict['vy']/100.0)**2),
                    'timestamp': int(time.time() * 1000)
                }
                db.collection('IHAData').document('position').set(position_data)
            # Attitude verisi
            elif msg_type == 'ATTITUDE':
                attitude_data = {
                    'roll': math.degrees(msg_dict['roll']),
                    'pitch': math.degrees(msg_dict['pitch']),
                    'yaw': math.degrees(msg_dict['yaw']),
                    'rollspeed': math.degrees(msg_dict['rollspeed']),
                    'pitchspeed': math.degrees(msg_dict['pitchspeed']),
                    'yawspeed': math.degrees(msg_dict['yawspeed'])
                }
                update_and_send_if_changed('attitude', attitude_data)
            # Batarya verisi
            elif msg_type == 'SYS_STATUS':
                battery_data = {
                    'voltage': msg_dict['voltage_battery'] / 1000.0 if msg_dict['voltage_battery'] != 0 else 0,
                    'current': msg_dict['current_battery'] / 100.0 if msg_dict['current_battery'] != -1 else 0,
                    'remaining': msg_dict['battery_remaining'] if msg_dict['battery_remaining'] != -1 else 0,
                    'temperature': msg_dict.get('battery_temperature', 0)
                }
                update_and_send_if_changed('battery', battery_data)
            # GPS verisi
            elif msg_type == 'GPS_RAW_INT':
                gps_data = {
                    'fix_type': msg_dict['fix_type'],
                    'satellites_visible': msg_dict['satellites_visible'],
                    'eph': msg_dict['eph'] / 100.0 if msg_dict['eph'] != 65535 else 0,
                    'epv': msg_dict['epv'] / 100.0 if msg_dict['epv'] != 65535 else 0,
                    'hdop': msg_dict.get('hdop', 0) / 100.0,
                    'vdop': msg_dict.get('vdop', 0) / 100.0,
                    'fix_status': 'NO_FIX' if msg_dict['fix_type'] < 2 else 'FIX_2D' if msg_dict['fix_type'] == 2 else 'FIX_3D'
                }
                update_and_send_if_changed('gps', gps_data)
            # Sistem durumu
            elif msg_type == 'HEARTBEAT':
                armed, flight_mode, system_status = get_flight_mode(
                    msg_dict['base_mode'],
                    msg_dict['custom_mode'],
                    msg_dict['system_status']
                )
                # Gerçek safety switch durumu base_mode'dan alınır
                safety_switch = bool(msg_dict['base_mode'] & mavutil.mavlink.MAV_MODE_FLAG_SAFETY_ENABLED)
                print("SAFETY SWITCH (gerçek):", safety_switch)
                status_data = {
                    'mode': flight_mode,
                    'armed': armed,
                    'system_status': system_status,
                    'safety_switch': safety_switch,
                    'timestamp': int(time.time() * 1000)
                }
                update_and_send_if_changed('status', status_data)
            time.sleep(0.01)  # CPU kullanımını azaltmak için kısa bekleme
        except Exception as e:
            log(f"IHA1 veri işleme hatası: {e}", error=True)
            time.sleep(1)

# IHA2 için veri işleme fonksiyonu

def process_iha2():
    request_data_stream(mav_connection2)
    while True:
        try:
            msg = mav_connection2.recv_match(blocking=True, timeout=1.0)
            if not msg:
                continue
            msg_dict = msg.to_dict()
            msg_type = msg.get_type()
            # Konum verisi
            if msg_type == 'GLOBAL_POSITION_INT':
                position_data = {
                    'lat': msg_dict['lat'] / 1e7,
                    'lon': msg_dict['lon'] / 1e7,
                    'alt': msg_dict['alt'] / 1000.0,
                    'relative_alt': msg_dict['relative_alt'] / 1000.0,
                    'vx': msg_dict['vx'] / 100.0,
                    'vy': msg_dict['vy'] / 100.0,
                    'vz': msg_dict['vz'] / 100.0,
                    'hdg': msg_dict['hdg'] / 100.0,
                    'ground_speed': math.sqrt((msg_dict['vx']/100.0)**2 + (msg_dict['vy']/100.0)**2),
                    'timestamp': int(time.time() * 1000)
                }
                db.collection('IHA2Data').document('position').set(position_data)
            # Attitude verisi
            elif msg_type == 'ATTITUDE':
                attitude_data = {
                    'roll': math.degrees(msg_dict['roll']),
                    'pitch': math.degrees(msg_dict['pitch']),
                    'yaw': math.degrees(msg_dict['yaw']),
                    'rollspeed': math.degrees(msg_dict['rollspeed']),
                    'pitchspeed': math.degrees(msg_dict['pitchspeed']),
                    'yawspeed': math.degrees(msg_dict['yawspeed'])
                }
                update_and_send_if_changed('attitude', attitude_data)
            # Batarya verisi
            elif msg_type == 'SYS_STATUS':
                battery_data = {
                    'voltage': msg_dict['voltage_battery'] / 1000.0 if msg_dict['voltage_battery'] != 0 else 0,
                    'current': msg_dict['current_battery'] / 100.0 if msg_dict['current_battery'] != -1 else 0,
                    'remaining': msg_dict['battery_remaining'] if msg_dict['battery_remaining'] != -1 else 0,
                    'temperature': msg_dict.get('battery_temperature', 0)
                }
                update_and_send_if_changed('battery', battery_data)
            # GPS verisi
            elif msg_type == 'GPS_RAW_INT':
                gps_data = {
                    'fix_type': msg_dict['fix_type'],
                    'satellites_visible': msg_dict['satellites_visible'],
                    'eph': msg_dict['eph'] / 100.0 if msg_dict['eph'] != 65535 else 0,
                    'epv': msg_dict['epv'] / 100.0 if msg_dict['epv'] != 65535 else 0,
                    'hdop': msg_dict.get('hdop', 0) / 100.0,
                    'vdop': msg_dict.get('vdop', 0) / 100.0,
                    'fix_status': 'NO_FIX' if msg_dict['fix_type'] < 2 else 'FIX_2D' if msg_dict['fix_type'] == 2 else 'FIX_3D'
                }
                update_and_send_if_changed('gps', gps_data)
            # Sistem durumu
            elif msg_type == 'HEARTBEAT':
                armed, flight_mode, system_status = get_flight_mode(
                    msg_dict['base_mode'],
                    msg_dict['custom_mode'],
                    msg_dict['system_status']
                )
                # Gerçek safety switch durumu base_mode'dan alınır
                safety_switch = bool(msg_dict['base_mode'] & mavutil.mavlink.MAV_MODE_FLAG_SAFETY_ENABLED)
                print("SAFETY SWITCH (gerçek):", safety_switch)
                status_data = {
                    'mode': flight_mode,
                    'armed': armed,
                    'system_status': system_status,
                    'safety_switch': safety_switch,
                    'timestamp': int(time.time() * 1000)
                }
                update_and_send_if_changed('status', status_data)
            time.sleep(0.01)  # CPU kullanımını azaltmak için kısa bekleme
        except Exception as e:
            log(f"IHA2 veri işleme hatası: {e}", error=True)
            time.sleep(1)

# Thread'leri başlat
threading.Thread(target=process_iha1, daemon=True).start()
threading.Thread(target=process_iha2, daemon=True).start()

# Ana thread'i sonsuza kadar beklet
while True:
    time.sleep(10)

nodejs_socket.close()
mav_connection1.close()
mav_connection2.close()