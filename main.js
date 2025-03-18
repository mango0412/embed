(() => {
    document.addEventListener('DOMContentLoaded', () => {
        const url = new URL(window.location);
        const vid = url.searchParams.get('v') ?? 'NAo38Q9c4xA';
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

// 추가: 영상 종료 감지 함수 (YouTube IFrame API 콜백)
function onYouTubeIframeAPIReady() {
    new YT.Player('player', {
        events: {
            onStateChange: event => {
                if (event.data === YT.PlayerState.ENDED) {
                    console.log(`End of video = ${vid}`);
                }
            }
        }
    });
}