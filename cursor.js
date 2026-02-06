const cursorBall = document.querySelector('.cursor-ball');

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

let ballX = mouseX;
let ballY = mouseY;

// 0.1 → daha yavaş, 0.25 → daha hızlı; 0.15 güzel bir orta değer
const speed = 0.15;
const size = 20;

// Fare hareketini sadece hedef olarak kaydediyoruz
window.addEventListener('mousemove', (e) => {
    mouseX = e.clientX;
    mouseY = e.clientY;
});

// Her frame'de topu hedefe doğru yaklaştır
function animate() {
    // lerp: mevcut konum + (hedef - mevcut) * hız
    ballX += (mouseX - ballX) * speed;
    ballY += (mouseY - ballY) * speed;

    cursorBall.style.transform = `translate3d(${ballX - size / 2}px, ${ballY - size / 2}px, 0)`;

    requestAnimationFrame(animate);
}

// Animasyonu başlat
animate();

// HER TIKLAMADA YENİ PULSE OLUŞTUR
window.addEventListener('click', () => {
    const pulse = document.createElement('span');
    pulse.classList.add('cursor-pulse');
    cursorBall.appendChild(pulse);

    // animasyon bitince span'i DOM'dan sil
    pulse.addEventListener('animationend', () => {
        pulse.remove();
    });
});
