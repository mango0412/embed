// 전역 변수 선언
let playerInstance;

// 초기화 함수
(() => {
    document.addEventListener('DOMContentLoaded', () => {
        const url = new URL(window.location);
        const vid = url.searchParams.get('v') ?? 'IuABDADGeP0';
        url.searchParams.delete('v');
        url.searchParams.set('enablejsapi', '1');

        const embedUrl = new URL(`https://www.youtube.com/embed/${vid}?${url.searchParams.toString()}`);
        const iframe = document.getElementById('player');
        if (iframe) {
            iframe.src = embedUrl.href;
        }

        // YouTube IFrame API 로드
        const tag = document.createElement('script');
        tag.src = "https://www.youtube.com/iframe_api";
        document.getElementsByTagName('script')[0].parentNode.insertBefore(tag, document.getElementsByTagName('script')[0]);

        // 상태 표시 UI 초기화 코드 제거
    });
})();

// YouTube IFrame API 준비 완료 핸들러
function onYouTubeIframeAPIReady() {
    playerInstance = new YT.Player('player', {
        events: {
            onReady: onPlayerReady,
            onError: handlePlayerError
        }
    });
}

// 플레이어 준비 완료 핸들러
function onPlayerReady() {
    if (typeof startPlayerMonitoring === 'function') {
        startPlayerMonitoring();
    }
}