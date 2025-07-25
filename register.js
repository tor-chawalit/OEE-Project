document.getElementById('registerForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;
    const fullname = document.getElementById('fullname').value.trim();
    const email = document.getElementById('email').value.trim();
    const errorDiv = document.getElementById('registerError');
    errorDiv.style.display = 'none';

    if (!username || !password || !fullname || !email) {
        errorDiv.textContent = 'กรุณากรอกข้อมูลให้ครบถ้วน';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const res = await fetch('register.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password, fullname, email })
        });
        const data = await res.json();
        if (data.success) {
            alert('สมัครสมาชิกสำเร็จ! กรุณาเข้าสู่ระบบ');
            window.location.href = 'login.html';
        } else {
            errorDiv.textContent = data.message || 'เกิดข้อผิดพลาด';
            errorDiv.style.display = 'block';
        }
    } catch {
        errorDiv.textContent = 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์';
        errorDiv.style.display = 'block';
    }
});
