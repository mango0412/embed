/**
 * YouTube 플레이어 이벤트 리스너 예제
 * 
 * 이 파일은 부모 창에서 YouTube 플레이어의 이벤트를 수신하는 방법을 보여줍니다.
 * 실제 사용 시 부모 창의 HTML에 이 스크립트를 포함시키세요.
 */

// 이벤트 수신 정보
const youtubeEvents = {
    receivedEvents: [],
    lastBatchTime: null,
    playerState: {
        currentVideo: null,
        isPlaying: false,
        currentTime: 0,
        duration: 0,
        percentComplete: 0
    }
};

// YouTube 플레이어 이벤트 리스너 설정
window.addEventListener('message', function (event) {
    // 필요한 경우 출처 검증 (보안상 중요)
    // if (event.origin !== "허용된_출처") return;

    const data = event.data;

    // 단일 이벤트 처리
    if (data.type === 'videoEvent') {
        handleVideoEvent(data);
    }

    // 배치 이벤트 처리
    if (data.type === 'videoEventBatch') {
        youtubeEvents.lastBatchTime = new Date();

        // 배치의 각 메시지 처리
        if (Array.isArray(data.messages)) {
            data.messages.forEach(message => handleVideoEvent(message));
        }

        // 배치 정보 로깅
        console.log(`YouTube 이벤트 배치 수신: ${data.count}개 이벤트, 배치 ID: ${data.batchId}`);
    }
});

// 비디오 이벤트 처리 함수
function handleVideoEvent(eventData) {
    // 이벤트 기록
    youtubeEvents.receivedEvents.push({
        time: new Date(),
        data: eventData
    });

    // 최근 100개 이벤트만 유지
    if (youtubeEvents.receivedEvents.length > 100) {
        youtubeEvents.receivedEvents.shift();
    }

    // 플레이어 상태 업데이트
    updatePlayerState(eventData);

    // 이벤트 타입별 처리
    switch (eventData.event) {
        case 'started':
            console.log(`▶️ 비디오 시작: ${eventData.videoId}`);
            // 비디오 시작 시 수행할 작업 (예: 재생 추적 시작)
            break;

        case 'ended':
            console.log(`⏹️ 비디오 종료: ${eventData.videoId}`);
            // 비디오 종료 시 수행할 작업 (예: 다음 비디오 추천)
            break;

        case 'paused':
            console.log(`⏸️ 비디오 일시정지: ${eventData.formattedTime} / ${eventData.formattedDuration}`);
            // 일시정지 시 수행할 작업
            break;

        case 'progress':
            // 진행상황 업데이트 (UI 업데이트 등)
            updateProgressUI(eventData);
            break;

        case 'error':
        case 'errorOther':
            console.error(`❌ 비디오 오류 (${eventData.errorCode}): ${eventData.errorDetails}`);
            // 오류 처리 (예: 대체 콘텐츠 표시)
            break;

        case 'buffering':
            console.log(`🔄 버퍼링 중: ${eventData.bufferingPosition}%`);
            // 버퍼링 표시
            break;

        default:
            // 기타 이벤트 처리
            console.log(`YouTube 이벤트: ${eventData.event}`, eventData);
    }

    // 커스텀 이벤트 발생 (다른 스크립트에서 수신 가능)
    const customEvent = new CustomEvent('youtubePlayerEvent', {
        detail: eventData,
        bubbles: true
    });
    window.dispatchEvent(customEvent);
}

// 플레이어 상태 업데이트
function updatePlayerState(eventData) {
    if (eventData.videoId) {
        youtubeEvents.playerState.currentVideo = eventData.videoId;
    }

    if (eventData.event === 'started') {
        youtubeEvents.playerState.isPlaying = true;
    } else if (eventData.event === 'paused' || eventData.event === 'ended') {
        youtubeEvents.playerState.isPlaying = false;
    }

    if (eventData.currentTime !== undefined) {
        youtubeEvents.playerState.currentTime = eventData.currentTime;
    }

    if (eventData.duration !== undefined) {
        youtubeEvents.playerState.duration = eventData.duration;
    }

    if (eventData.percentComplete !== undefined) {
        youtubeEvents.playerState.percentComplete = eventData.percentComplete;
    }
}

// 진행 상황 UI 업데이트 예제
function updateProgressUI(eventData) {
    // 실제 프로젝트에서는 DOM 요소를 업데이트하는 코드
    // 예:
    // document.getElementById('progress-bar').style.width = `${eventData.percentComplete}%`;
    // document.getElementById('current-time').textContent = eventData.formattedTime;

    // 디버깅을 위한 로깅 (실제 사용 시 제거 가능)
    if (parseInt(eventData.percentComplete) % 10 === 0) { // 10% 단위로만 로깅
        console.log(`📊 재생 진행률: ${eventData.percentComplete}% (${eventData.formattedTime} / ${eventData.formattedDuration})`);
    }
}

// 현재 상태 콘솔 출력 함수 (디버깅용)
window.showYouTubeEvents = function () {
    console.table(youtubeEvents.playerState);
    console.log('최근 이벤트:', youtubeEvents.receivedEvents.slice(-5));
    return youtubeEvents;
};

// YouTube 플레이어 컨트롤 API
window.YouTubePlayerAPI = (function () {
    let requestCount = 0;
    const pendingRequests = {};
    const DEFAULT_TIMEOUT = 5000; // 5초 타임아웃
    let playerFrame = null;

    // 메시지 리스너 설정
    window.addEventListener('message', function (event) {
        // 응답 메시지 처리
        if (event.data && event.data.type === 'youtubeResponse') {
            const requestId = event.data.requestId;
            const pendingRequest = pendingRequests[requestId];

            if (pendingRequest) {
                // 타임아웃 취소
                if (pendingRequest.timeoutId) {
                    clearTimeout(pendingRequest.timeoutId);
                }

                // 콜백 실행
                if (event.data.status === 'success') {
                    pendingRequest.resolve(event.data);
                } else {
                    pendingRequest.reject(new Error(event.data.error || 'Unknown error'));
                }

                // 요청 목록에서 제거
                delete pendingRequests[requestId];
            }
        }
    });

    // 플레이어 iframe 찾기
    function findPlayerFrame() {
        if (playerFrame) return playerFrame;

        const frames = document.querySelectorAll('iframe');
        for (let i = 0; i < frames.length; i++) {
            const src = frames[i].src || '';
            if (src.includes('youtube.com/embed/')) {
                playerFrame = frames[i];
                return playerFrame;
            }
        }

        throw new Error('YouTube 플레이어 iframe을 찾을 수 없습니다.');
    }

    // 명령 전송 함수
    function sendCommand(command, params = {}, timeout = DEFAULT_TIMEOUT) {
        return new Promise((resolve, reject) => {
            try {
                const frame = findPlayerFrame();
                const requestId = `req_${Date.now()}_${requestCount++}`;

                // 요청 메시지 생성
                const message = {
                    type: 'youtubeCommand',
                    command: command,
                    requestId: requestId,
                    ...params
                };

                // 타임아웃 설정
                const timeoutId = setTimeout(() => {
                    if (pendingRequests[requestId]) {
                        delete pendingRequests[requestId];
                        reject(new Error(`Command ${command} timed out after ${timeout}ms`));
                    }
                }, timeout);

                // 요청 정보 저장
                pendingRequests[requestId] = { resolve, reject, timeoutId };

                // iframe에 메시지 전송
                frame.contentWindow.postMessage(message, '*');
            } catch (error) {
                reject(error);
            }
        });
    }

    // 공개 API
    return {
        // 플레이어 제어 함수들
        play: () => sendCommand('play'),
        pause: () => sendCommand('pause'),
        stop: () => sendCommand('stop'),
        mute: () => sendCommand('mute'),
        unmute: () => sendCommand('unmute'),
        setVolume: (volume) => sendCommand('setVolume', { volume }),
        seekTo: (time, allowSeekAhead = true) => sendCommand('seekTo', { time, allowSeekAhead }),
        setPlaybackRate: (rate) => sendCommand('setPlaybackRate', { rate }),
        loadVideo: (videoId, startSeconds = 0, quality = 'default') =>
            sendCommand('loadVideo', { videoId, startSeconds, quality }),
        cueVideo: (videoId, startSeconds = 0, quality = 'default') =>
            sendCommand('cueVideo', { videoId, startSeconds, quality }),
        setPlaybackQuality: (quality) => sendCommand('setPlaybackQuality', { quality }),

        // 상태 조회 함수들
        getState: () => sendCommand('getState'),
        getVideoData: () => sendCommand('getVideoData'),
        getDuration: () => sendCommand('getDuration'),
        getCurrentTime: () => sendCommand('getCurrentTime'),
        getAvailableQualityLevels: () => sendCommand('getAvailableQualityLevels'),
        getPlaybackQuality: () => sendCommand('getPlaybackQuality'),

        // 유틸리티 함수들
        getPlayerEvents: () => youtubeEvents,
        isReady: function () {
            try {
                findPlayerFrame();
                return true;
            } catch (e) {
                return false;
            }
        }
    };
})();

// 사용 예시 (콘솔에서 실행 가능)
// 비동기 호출 예시:
/*
YouTubePlayerAPI.play().then(() => console.log('재생 시작!'));
YouTubePlayerAPI.getState().then(response => console.log('현재 상태:', response.data));
YouTubePlayerAPI.seekTo(30).then(() => console.log('30초 위치로 이동!'));
*/
