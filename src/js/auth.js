import { supabase } from './supabase-client.js';

// --- DEFAULT TEMPLATES ---
async function addDefaultTemplates(userId) {
    const defaultMailCraftTemplates = [{ name: "General Welcome", subject: "Welcome, {{nombre}}!", content: `<p>Hi {{nombre}},</p><p>Thanks for joining! We're excited to have you. Let us know if you need anything.</p>`, type: "mailcraft" },{ name: "Follow-Up", subject: "Quick Follow-Up", content: `<p>Hi {{nombre}},</p><p>Just checking in to see how things are going. Feel free to ask any questions!</p>`, type: "mailcraft" }];
    const defaultWhatsCraftTemplates = [{ name: "Initial Contact 👋", content: `<p>Hello {{nombre}}! How are you?</p>`, type: "whatscraft" }];
    const allTemplates = [...defaultMailCraftTemplates, ...defaultWhatsCraftTemplates];
    const templatesWithUser = allTemplates.map(template => ({ ...template, user_id: userId }));
    const { error } = await supabase.from('templates').insert(templatesWithUser);
    if (error) console.error('Error adding default templates:', error);
}

// --- FUNCIÓN PARA MOSTRAR/OCULTAR CONTRASEÑA ---
function setupPasswordToggle() {
    const toggleButton = document.getElementById('toggle-password');
    const passwordInput = document.getElementById('password');
    if (toggleButton && passwordInput) {
        toggleButton.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
        });
    }
}

// --- LÓGICA DE REGISTRO ---
const registerForm = document.getElementById('register-form');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = registerForm.querySelector('#submit-button');
        const buttonText = submitButton.querySelector('.button-text');
        const loader = submitButton.querySelector('.loader-white');

        submitButton.disabled = true;
        buttonText.classList.add('hidden');
        loader.classList.remove('hidden');

        try {
            const name = document.getElementById('name').value;
            const lastname = document.getElementById('lastname').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const preferredLanguage = registerForm.querySelector('.language-selector').value;

            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        name: name,
                        last_name: lastname,
                        lang: preferredLanguage
                    }
                }
            });

            if (error) {
                alert('Error al registrarse: ' + error.message);
                return;
            }

            if (data.user) {
                await addDefaultTemplates(data.user.id);
                alert('¡Éxito! Revisa tu correo para confirmar tu cuenta.');
                window.location.href = 'index.html';
            }
        } finally {
            submitButton.disabled = false;
            buttonText.classList.remove('hidden');
            loader.classList.add('hidden');
        }
    });
    setupPasswordToggle();
}

// --- LÓGICA DE LOGIN ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = loginForm.querySelector('#submit-button');
        const buttonText = submitButton.querySelector('.button-text');
        const loader = submitButton.querySelector('.loader-white');

        submitButton.disabled = true;
        buttonText.classList.add('hidden');
        loader.classList.remove('hidden');

        try {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const { error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                alert('Error al iniciar sesión: ' + error.message);
                return;
            }
            window.location.href = 'app.html';
        } finally {
            submitButton.disabled = false;
            buttonText.classList.remove('hidden');
            loader.classList.add('hidden');
        }
    });
    setupPasswordToggle();
}

// --- LÓGICA DE CONTRASEÑA OLVIDADA ---
const forgotPasswordLink = document.getElementById('forgot-password-link');
if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', async (e) => {
        e.preventDefault();
        const email = prompt("Por favor, introduce tu correo electrónico para restablecer la contraseña:");
        if (email) {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/app.html`,
            });
            if (error) {
                alert("Error: " + error.message);
            } else {
                alert("Se ha enviado un correo para restablecer tu contraseña. Revisa tu bandeja de entrada.");
            }
        }
    });
}

// --- LÓGICA DEL SELECTOR DE IDIOMA ---
document.querySelectorAll('.language-selector').forEach(selector => {
    if (window.App && App.i18n) {
        selector.value = App.i18n.lang;
    }
    selector.addEventListener('change', (event) => {
        if (window.App && App.i18n) {
            App.i18n.setLanguage(event.target.value);
        }
    });
});