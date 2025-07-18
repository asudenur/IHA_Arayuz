import React, { useState } from 'react';

const VIDEO_URL = 'http://172.20.10.2:8080/video_feed';

const VideoStream = () => {
    const [loading, setLoading] = useState(true);

    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'black',
            position: 'relative'
        }}>
            {loading && (
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    color: 'white',
                    zIndex: 2
                }}>
                    Yükleniyor...
                </div>
            )}
            <img
                src={VIDEO_URL}
                alt="Kamera Görüntüsü"
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: loading ? 'none' : 'block'
                }}
                onLoad={() => setLoading(false)}
                onError={() => setLoading(false)}
            />
        </div>
    );
};

export default VideoStream; 