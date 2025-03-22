// 상태 표시 UI 관련 변수
let statusElement = null;

// 상태 표시 UI 요소 생성 함수 - 비활성화 (디버그 모드일 때만 활성화)
function createStatusDisplay() {
    // 디버그 모드가 활성화되지 않으면 상태 표시를 생성하지 않음
    const debugMode = false; // 디버그 모드 비활성화

    if (!debugMode) return;

    // 기존 상태 표시 요소가 있으면 제거
    if (document.getElementById('player-status-display')) {
        document.getElementById('player-status-display').remove();
    }

    // 새 상태 표시 컨테이너 생성
    statusElement = document.createElement('div');
    statusElement.id = 'player-status-display';
    statusElement.style.cssText = `
        position: absolute;
        bottom: 10px;
        left: 10px;
        background: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 10px;
        border-radius: 5px;
        font-family: Arial, sans-serif;
        font-size: 12px;
        z-index: 9999;
        max-width: 300px;
    `;

    // 초기 상태 텍스트 설정
    statusElement.innerHTML = `
        <div><b>상태:</b> <span id="play-state">초기화 중...</span></div>
        <div><b>동영상 ID:</b> <span id="video-id">불러오는 중...</span></div>
        <div><b>시간:</b> <span id="current-time">0:00</span> / <span id="duration">0:00</span></div>
        <div id="progress-bar-container" style="width:100%; height:5px; background:#444; margin-top:5px;">
            <div id="progress-bar" style="width:0%; height:100%; background:#f00;"></div>
        </div>
        <div><b>로딩:</b> <span id="loaded-fraction">0%</span></div>
        <div><b>재생속도:</b> <span id="playback-rate">1x</span></div>
    `;

    document.body.appendChild(statusElement);
}

// 상태 표시 UI 업데이트 함수 - 비활성화
function updateStatusDisplay(state, currentTime, duration, videoId, loadedFraction, playbackRate) {
    // 상태 요소가 없으면 아무 작업도 하지 않음
    if (!statusElement) return;

    // 상태 텍스트 매핑
    const stateTexts = {
        [-1]: '시작되지 않음',
        [YT.PlayerState.ENDED]: '종료됨',
        [YT.PlayerState.PLAYING]: '재생 중',
        [YT.PlayerState.PAUSED]: '일시정지',
        [YT.PlayerState.BUFFERING]: '버퍼링 중',
        [YT.PlayerState.CUED]: '준비됨'
    };

    // 각 요소 업데이트
    const stateElement = document.getElementById('play-state');
    if (stateElement) stateElement.textContent = stateTexts[state] || '알 수 없음';

    const videoIdElement = document.getElementById('video-id');
    if (videoIdElement) videoIdElement.textContent = videoId || 'N/A';

    const currentTimeElement = document.getElementById('current-time');
    if (currentTimeElement) currentTimeElement.textContent = formatTime(currentTime);

    const durationElement = document.getElementById('duration');
    if (durationElement) durationElement.textContent = formatTime(duration);

    const progressBar = document.getElementById('progress-bar');
    if (progressBar) progressBar.style.width = `${(currentTime / duration * 100) || 0}%`;

    const loadedElement = document.getElementById('loaded-fraction');
    if (loadedElement) loadedElement.textContent = `${Math.round(loadedFraction * 100)}%`;

    const rateElement = document.getElementById('playback-rate');
    if (rateElement) rateElement.textContent = `${playbackRate}x`;
}
