// 전역 변수 선언
let playerInstance;

(() => {
    document.addEventListener('DOMContentLoaded', () => {
        const url = new URL(window.location);
        // const vid = url.searchParams.get('v') ?? 'NAo38Q9c4xA';
        const vid = url.searchParams.get('v') ?? 'Hwcb6VY9YUU';
        url.searchParams.delete('v');
        // enablejsapi 파라미터 추가
        url.searchParams.set('enablejsapi', '1');
        const embedUrl = new URL(`https://www.youtube.com/embed/${vid}?${url.searchParams.toString()}`);
        const iframe = document.getElementById('player');
        if (iframe) {
            iframe.src = embedUrl.href;
        }
        // 추가: YouTube IFrame API 스크립트 로드
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        document.getElementsByTagName('script')[0].parentNode.insertBefore(tag, document.getElementsByTagName('script')[0]);
    });
})();

// 기존 onYouTubeIframeAPIReady 함수 (playerInstance에 할당하도록 수정)
function onYouTubeIframeAPIReady() {
    playerInstance = new YT.Player('player', {
        events: {
            onStateChange: event => {
                if (event.data === YT.PlayerState.ENDED) {
                    const message = {
                        type: 'videoEvent',
                        event: 'ended',
                        videoId: event.target.getVideoData().video_id
                    };
                    window.parent.postMessage(message, '*'); // 영상 종료 메시지를 부모 창에 전송
                } else if (event.data === YT.PlayerState.PLAYING) {
                    const message = {
                        type: 'videoEvent',
                        event: 'started',
                        videoId: event.target.getVideoData().video_id
                    };
                    window.parent.postMessage(message, '*'); // 영상 시작 메시지를 부모 창에 전송
                }
            },
            onError: event => {
                if (event.data === 101 || event.data === 150) {
                    console.error("YouTube Error (101/150):", event.data); // 콘솔 출력 추가
                    const message = {
                        type: 'videoEvent',
                        event: 'error',
                        videoId: event.target.getVideoData().video_id,
                        errorCode: event.data
                    };
                    window.parent.postMessage(message, '*'); // 기존 에러 메시지 처리
                } else {
                    console.error("YouTube Other Error:", event.data); // 콘솔 출력 추가
                    const message = {
                        type: 'videoEvent',
                        event: 'errorOther',
                        videoId: event.target.getVideoData().video_id,
                        errorCode: event.data
                    };
                    window.parent.postMessage(message, '*'); // 기타 에러 메시지 처리
                }
            }
        }
    });
}