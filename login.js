document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    errorDiv.style.display = 'none';
    if (!username || !password) {
        errorDiv.textContent = 'กรุณากรอกชื่อผู้ใช้และรหัสผ่าน';
        errorDiv.style.display = 'block';
        return;
    }
    try {
        const res = await fetch('login.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        if (!res.ok) {
            errorDiv.textContent = 'เซิร์ฟเวอร์ไม่ตอบสนอง (' + res.status + ')';
            errorDiv.style.display = 'block';
            return;
        }
        let data;
        try {
            data = await res.json();
        } catch {
            errorDiv.textContent = 'รูปแบบข้อมูลที่ได้จากเซิร์ฟเวอร์ไม่ถูกต้อง';
            errorDiv.style.display = 'block';
            return;
        }
        if (data.success) {
            window.location.href = 'index.html';
        } else {
            errorDiv.textContent = data.message || 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
            errorDiv.style.display = 'block';
        }
    } catch (err) {
        errorDiv.textContent = 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์';
        errorDiv.style.display = 'block';
    }
});
