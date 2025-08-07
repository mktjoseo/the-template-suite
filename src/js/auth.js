import { supabase } from './supabase-client.js';

// --- DEFAULT TEMPLATES ---
// These will be added to every new user's account.
const defaultMailCraftTemplates = [
    { name: "General Welcome", subject: "Welcome, {{nombre}}!", content: `<p>Hi {{nombre}},</p><p>Thanks for joining! We're excited to have you. Let us know if you need anything.</p>`, type: "mailcraft" },
    { name: "Follow-Up", subject: "Quick Follow-Up", content: `<p>Hi {{nombre}},</p><p>Just checking in to see how things are going. Feel free to ask any questions!</p>`, type: "mailcraft" }
];

const defaultWhatsCraftTemplates = [
    { name: "Initial Contact 👋", content: `<p>Hello {{nombre}}! How are you?</p>`, type: "whatscraft" },
];


/**
 * Inserts the default templates for a new user.
 * @param {string} userId - The UUID of the new user.
 */
async function addDefaultTemplates(userId) {
    const allTemplates = [...defaultMailCraftTemplates, ...defaultWhatsCraftTemplates];
    const templatesWithUser = allTemplates.map(template => ({ ...template, user_id: userId }));

    const { error } = await supabase.from('templates').insert(templatesWithUser);

    if (error) {
        console.error('Error adding default templates:', error);
    }
}


// --- REGISTRATION LOGIC ---
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = registerForm.querySelector('#submit-button');
        const buttonText = submitButton.querySelector('.button-text');
        const loader = submitButton.querySelector('.loader-white');

        // Inicia la carga
        submitButton.disabled = true;
        buttonText.classList.add('hidden');
        loader.classList.remove('hidden');

        try {
            const name = document.getElementById('name').value;
            const lastname = document.getElementById('lastname').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const { data, error } = await supabase.auth.signUp({
                email: email, password: password,
                options: { data: { name: name, last_name: lastname } }
            });

            if (error) {
                alert('Error signing up: ' + error.message);
                return;
            }

            if (data.user) {
                await addDefaultTemplates(data.user.id);
                alert('Success! Please check your email to confirm your account.');
                window.location.href = 'index.html';
            }
        } finally {
            // Detiene la carga (siempre se ejecuta, incluso con errores)
            submitButton.disabled = false;
            buttonText.classList.remove('hidden');
            loader.classList.add('hidden');
        }
    });
}

// --- LOGIN LOGIC ---
const loginForm = document.getElementById('login-form');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitButton = loginForm.querySelector('#submit-button');
        const buttonText = submitButton.querySelector('.button-text');
        const loader = submitButton.querySelector('.loader-white');

        // Inicia la carga
        submitButton.disabled = true;
        buttonText.classList.add('hidden');
        loader.classList.remove('hidden');

        try {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password,
            });

            if (error) {
                alert('Error logging in: ' + error.message);
                return;
            }
            window.location.href = 'app.html';
        } finally {
            // Detiene la carga
            submitButton.disabled = false;
            buttonText.classList.remove('hidden');
            loader.classList.add('hidden');
        }
    });
}