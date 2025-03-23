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
            onReady: (e) => {
                window.parent.postMessage({
                    event: 'PlayerReady',
                    // 영상 전체 길이(초 단위)
                    duration: e.target.getDuration(),
                    // 현재 영상의 정보(제목, 비디오 ID 등)
                    videoData: e.target.getVideoData(),
                    // 볼륨 크기(0~100)
                    volume: e.target.getVolume(),
                    // 재생 중인 위치(초 단위)
                    currentTime: e.target.getCurrentTime()
                }, '*');
            },
            onStateChange: (e) => {
                window.parent.postMessage({
                    event: 'PlayerStateChange',
                    // 플레이어 상태(재생, 일시정지, 버퍼링 등)
                    state: e.data,
                    // 재생 중인 위치(초 단위)
                    currentTime: e.target.getCurrentTime(),
                    // 볼륨 크기(0~100)
                    volume: e.target.getVolume()
                }, '*');
            },
            onPlaybackQualityChange: (e) => {
                window.parent.postMessage({
                    event: 'QualityChange',
                    // 화질 정보(small, medium, large, hd720 등)
                    quality: e.data
                }, '*');
            },
            onError: (e) => {
                window.parent.postMessage({
                    event: 'Error',
                    // 에러 코드
                    errorCode: e.data
                }, '*');
            }
        }
    });
}
