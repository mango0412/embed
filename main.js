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

function onYouTubeIframeAPIReady() {
    playerInstance = new YT.Player('player', {
        events: {
            onReady: onPlayerReady,
            onStateChange: onPlayerStateChange
        }
    });
}

function onPlayerReady(event) {
    window.parent.postMessage({
        event: 'playerReady',
        currentTime: event.target.getCurrentTime(),
        duration: event.target.getDuration()
    }, '*');
}

function onPlayerStateChange(event) {
    window.parent.postMessage({
        event: 'stateChange',
        state: event.data,
        currentTime: event.target.getCurrentTime(),
        duration: event.target.getDuration()
    }, '*');
}
