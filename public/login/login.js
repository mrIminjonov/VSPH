<script>
    document.addEventListener('DOMContentLoaded', function() {
        const loginForm = document.getElementById('adminLoginForm'); // ID ni to‘g‘ri ishlatish

        loginForm.addEventListener('submit', function(event) {
            event.preventDefault();

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            console.log('Login attempt with username:', username); // Loginni log qilish

            fetch('/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            })
            .then(response => response.json()) // Har qanday javobni JSON formatiga o‘girish
            .then(data => {
                console.log('Server response data:', data); // Server javobini log qilish

                if (data.message === 'Login successful') {
                    alert('Login successful!');

                    // Sahifani o'zgartirish o'rniga, shu yerda formani ko'rsatish mumkin
                    document.getElementById('loginForm').style.display = 'none';
                    document.getElementById('publishForm').style.display = 'block';

                } else {
                    alert('Invalid username or password');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred. Please try again.');
            });
        });
    });
</script>
