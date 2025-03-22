// 시간 포맷 함수 (초 -> MM:SS)
function formatTime(seconds) {
    if (isNaN(seconds) || seconds === Infinity) return '0:00';
    seconds = Math.floor(seconds);
    const minutes = Math.floor(seconds / 60);
    seconds = seconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
