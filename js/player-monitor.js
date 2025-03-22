// 플레이어 모니터링 관련 변수
let lastPlayerState = -1;
let monitorId = null;
let lastProgressUpdate = 0;
let messageQueue = [];
let messageId = 0;
let lastSentMessage = null;
let retryCount = 0;
let messageProcessorActive = false;

// 플레이어 에러 핸들러
function handlePlayerError(event) {
    try {
        const videoData = event.target.getVideoData ? event.target.getVideoData() : { video_id: 'unknown' };
        const videoId = videoData.video_id;

        const errorType = (event.data === 101 || event.data === 150) ? 'error' : 'errorOther';
        console.error(`YouTube ${errorType}:`, event.data);

        enqueueMessage({
            event: errorType,
            videoId: videoId,
            errorCode: event.data,
            errorDetails: getErrorDetails(event.data),
            timestamp: Date.now()
        });
    } catch (error) {
        console.error('Error handling YouTube error:', error);
    }
}

// 에러 코드 설명 함수
function getErrorDetails(errorCode) {
    const errorMap = {
        2: '요청에 잘못된 매개변수 값이 포함되어 있습니다.',
        5: '요청한 콘텐츠는 HTML5 플레이어에서 재생할 수 없습니다.',
        100: '요청한 비디오를 찾을 수 없습니다.',
        101: '요청한 비디오의 소유자가 임베드된 플레이어에서 재생을 허용하지 않습니다.',
        150: '요청한 비디오의 소유자가 임베드된 플레이어에서 재생을 허용하지 않습니다.'
    };

    return errorMap[errorCode] || '알 수 없는 오류가 발생했습니다.';
}

// 플레이어 상태 모니터링 시작
function startPlayerMonitoring() {
    if (monitorId) {
        cancelAnimationFrame(monitorId);
    }
    monitorPlayerStatus();
    startMessageProcessor();
}

// 메시지 프로세서 시작
function startMessageProcessor() {
    if (!messageProcessorActive) {
        messageProcessorActive = true;
        processMessageQueue();
    }
}

// 메시지 큐 처리 함수
function processMessageQueue() {
    if (messageQueue.length > 0) {
        const messageBatch = messageQueue.splice(0, Math.min(5, messageQueue.length)); // 최대 5개 메시지 묶음
        sendMessageBatch(messageBatch);
    }

    setTimeout(processMessageQueue, 200); // 200ms 간격으로 큐 처리
}

// 메시지 배치 전송
function sendMessageBatch(messages) {
    if (!messages || messages.length === 0) return;

    const batchId = `batch_${Date.now()}`;
    const batchMessage = {
        type: 'videoEventBatch',
        batchId: batchId,
        messages: messages,
        count: messages.length,
        timestamp: Date.now()
    };

    try {
        window.parent.postMessage(batchMessage, '*');
        lastSentMessage = batchMessage;
        retryCount = 0;
    } catch (error) {
        console.error('메시지 전송 오류:', error);
        if (retryCount < 3) {
            retryCount++;
            setTimeout(() => sendMessageBatch(messages), 500 * retryCount);
        }
    }
}

// 메시지 큐에 추가
function enqueueMessage(messageData) {
    if (!messageData) return;

    const fullMessage = {
        id: `msg_${Date.now()}_${messageId++}`,
        type: 'videoEvent',
        ...messageData,
        playerInfo: collectPlayerInfo()
    };

    messageQueue.push(fullMessage);
}

// 플레이어 정보 수집
function collectPlayerInfo() {
    if (!playerInstance || typeof playerInstance.getPlayerState !== 'function') {
        return { available: false };
    }

    try {
        return {
            available: true,
            availableQualityLevels: playerInstance.getAvailableQualityLevels(),
            currentQuality: playerInstance.getPlaybackQuality(),
            videoUrl: playerInstance.getVideoUrl(),
            volume: playerInstance.getVolume(),
            isMuted: playerInstance.isMuted(),
            playerSize: {
                width: playerInstance.getIframe().offsetWidth,
                height: playerInstance.getIframe().offsetHeight
            }
        };
    } catch (error) {
        console.error('플레이어 정보 수집 오류:', error);
        return {
            available: false,
            error: error.message
        };
    }
}

// 플레이어 상태 모니터링 함수 (requestAnimationFrame 사용)
function monitorPlayerStatus() {
    checkPlayerStatus();
    monitorId = requestAnimationFrame(monitorPlayerStatus);
}

// 플레이어 상태 확인 및 정보 전송
function checkPlayerStatus() {
    if (!playerInstance || typeof playerInstance.getPlayerState !== 'function') {
        return;
    }

    try {
        const currentState = playerInstance.getPlayerState();
        const currentTime = playerInstance.getCurrentTime();
        const duration = playerInstance.getDuration();
        const videoId = playerInstance.getVideoData().video_id;
        const loadedFraction = playerInstance.getVideoLoadedFraction();
        const playbackRate = playerInstance.getPlaybackRate();
        const now = Date.now();

        // 플레이어 상태 변경 감지
        if (currentState !== lastPlayerState) {
            handleStateChange(currentState, videoId, currentTime, duration, loadedFraction, playbackRate);
            lastPlayerState = currentState;
        }

        // 재생 중인 경우 주기적으로 진행 상태 전송 (1초마다)
        if (currentState === YT.PlayerState.PLAYING && (now - lastProgressUpdate) > 1000) {
            sendProgressUpdate(videoId, currentTime, duration, loadedFraction, playbackRate);
            lastProgressUpdate = now;
        }
    } catch (error) {
        console.error('YouTube player monitoring error:', error);
        enqueueMessage({
            event: 'monitorError',
            error: error.message,
            timestamp: Date.now()
        });
    }
}

// 플레이어 상태 변경 처리
function handleStateChange(state, videoId, currentTime, duration, loadedFraction, playbackRate) {
    const stateMap = {
        [YT.PlayerState.PLAYING]: 'started',
        [YT.PlayerState.ENDED]: 'ended',
        [YT.PlayerState.PAUSED]: 'paused',
        [YT.PlayerState.BUFFERING]: 'buffering',
        [YT.PlayerState.CUED]: 'cued',
        [-1]: 'unstarted'
    };

    const eventName = stateMap[state] || `unknown_${state}`;

    // 상태별 기본 정보
    const baseInfo = {
        event: eventName,
        videoId: videoId,
        currentTime: currentTime,
        duration: duration,
        formattedTime: formatTime(currentTime),
        formattedDuration: formatTime(duration),
        timestamp: Date.now()
    };

    // 상태별 추가 정보
    let additionalInfo = {};

    switch (state) {
        case YT.PlayerState.PLAYING:
            additionalInfo = {
                loadedFraction: loadedFraction,
                playbackRate: playbackRate,
                percentComplete: (currentTime / duration * 100).toFixed(2)
            };
            break;

        case YT.PlayerState.ENDED:
            additionalInfo = {
                completionTime: Date.now(),
                totalPlayTime: currentTime // 최종 재생 시간
            };
            break;

        case YT.PlayerState.PAUSED:
            additionalInfo = {
                pausePosition: (currentTime / duration * 100).toFixed(2),
                remainingTime: duration - currentTime
            };
            break;

        case YT.PlayerState.BUFFERING:
            additionalInfo = {
                loadedFraction: loadedFraction,
                bufferingPosition: (currentTime / duration * 100).toFixed(2)
            };
            break;
    }

    // 메시지 큐에 추가
    enqueueMessage({
        ...baseInfo,
        ...additionalInfo
    });
}

// 진행 상태 업데이트 전송
function sendProgressUpdate(videoId, currentTime, duration, loadedFraction, playbackRate) {
    const percentComplete = (currentTime / duration) * 100;

    enqueueMessage({
        event: 'progress',
        videoId: videoId,
        currentTime: currentTime,
        duration: duration,
        formattedTime: formatTime(currentTime),
        formattedDuration: formatTime(duration),
        percentComplete: percentComplete.toFixed(2),
        loadedFraction: loadedFraction,
        playbackRate: playbackRate,
        remainingTime: duration - currentTime,
        formattedRemainingTime: formatTime(duration - currentTime),
        timestamp: Date.now()
    });

    lastProgressUpdate = Date.now();
}

// 부모 창으로부터 메시지 수신 리스너 추가
window.addEventListener('message', function (event) {
    // 부모 창으로부터 온 명령 메시지 처리
    if (event.data && event.data.type === 'youtubeCommand') {
        handleParentCommand(event.data, event.source);
    }
});

// 부모 창으로부터의 명령 처리
function handleParentCommand(command, source) {
    if (!playerInstance || typeof playerInstance.getPlayerState !== 'function') {
        sendResponse(source, {
            type: 'youtubeResponse',
            requestId: command.requestId,
            command: command.command,
            status: 'error',
            error: 'Player not initialized',
            timestamp: Date.now()
        });
        return;
    }

    let response = {
        type: 'youtubeResponse',
        requestId: command.requestId,
        command: command.command,
        status: 'success',
        timestamp: Date.now()
    };

    try {
        switch (command.command) {
            // 플레이어 제어 명령들
            case 'play':
                playerInstance.playVideo();
                break;

            case 'pause':
                playerInstance.pauseVideo();
                break;

            case 'stop':
                playerInstance.stopVideo();
                break;

            case 'mute':
                playerInstance.mute();
                break;

            case 'unmute':
                playerInstance.unMute();
                break;

            case 'setVolume':
                if (command.volume !== undefined && command.volume >= 0 && command.volume <= 100) {
                    playerInstance.setVolume(command.volume);
                    response.volume = command.volume;
                }
                break;

            case 'seekTo':
                if (command.time !== undefined) {
                    playerInstance.seekTo(command.time, command.allowSeekAhead ?? true);
                    response.time = command.time;
                }
                break;

            case 'setPlaybackRate':
                if (command.rate !== undefined) {
                    playerInstance.setPlaybackRate(command.rate);
                    response.rate = command.rate;
                }
                break;

            case 'loadVideo':
                if (command.videoId) {
                    playerInstance.loadVideoById(command.videoId, command.startSeconds || 0, command.quality || 'default');
                    response.videoId = command.videoId;
                }
                break;

            case 'cueVideo':
                if (command.videoId) {
                    playerInstance.cueVideoById(command.videoId, command.startSeconds || 0, command.quality || 'default');
                    response.videoId = command.videoId;
                }
                break;

            // 상태 조회 명령들
            case 'getState':
                response.data = {
                    state: playerInstance.getPlayerState(),
                    stateName: getPlayerStateName(playerInstance.getPlayerState()),
                    currentTime: playerInstance.getCurrentTime(),
                    duration: playerInstance.getDuration(),
                    formattedTime: formatTime(playerInstance.getCurrentTime()),
                    formattedDuration: formatTime(playerInstance.getDuration()),
                    videoId: playerInstance.getVideoData().video_id,
                    videoTitle: playerInstance.getVideoData().title,
                    loadedFraction: playerInstance.getVideoLoadedFraction(),
                    playbackRate: playerInstance.getPlaybackRate(),
                    volume: playerInstance.getVolume(),
                    isMuted: playerInstance.isMuted(),
                    playerInfo: collectPlayerInfo()
                };
                break;

            case 'getVideoData':
                response.data = playerInstance.getVideoData();
                break;

            case 'getDuration':
                response.data = {
                    duration: playerInstance.getDuration(),
                    formattedDuration: formatTime(playerInstance.getDuration())
                };
                break;

            case 'getCurrentTime':
                response.data = {
                    currentTime: playerInstance.getCurrentTime(),
                    formattedTime: formatTime(playerInstance.getCurrentTime())
                };
                break;

            case 'getAvailableQualityLevels':
                response.data = playerInstance.getAvailableQualityLevels();
                break;

            case 'getPlaybackQuality':
                response.data = playerInstance.getPlaybackQuality();
                break;

            case 'setPlaybackQuality':
                if (command.quality) {
                    playerInstance.setPlaybackQuality(command.quality);
                    response.quality = command.quality;
                }
                break;

            default:
                response.status = 'error';
                response.error = `Unknown command: ${command.command}`;
        }
    } catch (error) {
        response.status = 'error';
        response.error = error.message;
    }

    // 응답 전송
    sendResponse(source, response);
}

// 플레이어 상태 이름 가져오기
function getPlayerStateName(stateCode) {
    const stateMap = {
        [-1]: 'unstarted',
        [YT.PlayerState.ENDED]: 'ended',
        [YT.PlayerState.PLAYING]: 'playing',
        [YT.PlayerState.PAUSED]: 'paused',
        [YT.PlayerState.BUFFERING]: 'buffering',
        [YT.PlayerState.CUED]: 'cued'
    };
    return stateMap[stateCode] || `unknown(${stateCode})`;
}

// 부모 창에 응답 전송
function sendResponse(target, response) {
    try {
        target.postMessage(response, '*');
    } catch (error) {
        console.error('응답 전송 오류:', error);
    }
}
