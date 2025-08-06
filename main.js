// Objeto global para compartir funciones y estado entre módulos
// const App = {}; // Eliminado intencionalmente
// --- LÓGICA DE NAVEGACIÓN Y UI ---

function showPage(pageId, closeMenu = true) {
    const pages = document.querySelectorAll('.page');
    const navLinks = document.querySelectorAll('.sidebar-link');
    const mobileHeaderTitle = document.getElementById('mobile-header-title');
    const sidebar = document.getElementById('sidebar');
    const userMenu = document.getElementById('user-menu');

    pages.forEach(page => page.classList.add('hidden'));
    const targetPage = document.getElementById(pageId);
    if (targetPage) {
        targetPage.classList.remove('hidden');
    }

    navLinks.forEach(link => {
        link.classList.toggle('active', link.dataset.page === pageId);
    });

    const activeLink = document.querySelector(`.sidebar-link[data-page="${pageId}"]`);
    if (activeLink && mobileHeaderTitle && App.i18n) {
        const titleKey = activeLink.querySelector('span').dataset.i18n;
        mobileHeaderTitle.textContent = App.i18n.getString(titleKey);
        mobileHeaderTitle.dataset.i18n = titleKey;
    } else if (pageId === 'page-settings' && mobileHeaderTitle && App.i18n) {
        mobileHeaderTitle.textContent = App.i18n.getString('userMenuSettings');
        mobileHeaderTitle.dataset.i18n = 'userMenuSettings';
    }

    if (pageId === 'page-templates' && App.refreshTemplatesView) {
        App.refreshTemplatesView();
    }

    if (window.innerWidth < 1024 && sidebar) {
        sidebar.classList.remove('open');
    }
    
    if (closeMenu && userMenu) {
        userMenu.classList.add('hidden');
    }
}

// --- EVENT LISTENERS Y INICIALIZACIÓN CENTRALIZADA ---

document.addEventListener('DOMContentLoaded', () => {
    // 1. Traduce el contenido estático INMEDIATAMENTE al cargar la página
    if (App.i18n) {
        App.i18n.updateContent();
    }
    
    // 2. Configura el selector de idioma UNA VEZ para toda la aplicación
    document.body.addEventListener('change', (event) => {
        if (event.target.classList.contains('language-selector')) {
            if (App.i18n) {
                App.i18n.setLanguage(event.target.value);
            }
        }
    });

    // 3. Inicializa el resto de la app
    initMailCraft();
    initWhatsCraft();
    initTemplatesPage();
    initSettingsPage();
    showPage('page-home', false);

    // 4. Configura los listeners de navegación y UI (AHORA SÍ SE EJECUTARÁ)
    const sidebar = document.getElementById('sidebar');
    const menuToggle = document.getElementById('menu-toggle');
    const userMenuButton = document.getElementById('user-menu-button');
    const mobileUserMenuButton = document.getElementById('mobile-user-menu-button');
    const userMenu = document.getElementById('user-menu');
    const settingsLink = document.getElementById('settings-link');
    const logoutLink = document.getElementById('logout-link');

    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            showPage(e.currentTarget.dataset.page);
        });
    });

    document.body.addEventListener('click', (e) => {
        const navButton = e.target.closest('.nav-button');
        if (navButton) {
            e.preventDefault();
            showPage(navButton.dataset.page);
        }
    });

    if (menuToggle) {
        menuToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            sidebar.classList.toggle('open');
        });
    }

    function toggleUserMenu(e) {
        if (!userMenu) return;
        e.stopPropagation();
        userMenu.classList.toggle('hidden');
    }

    if (userMenuButton) userMenuButton.addEventListener('click', toggleUserMenu);
    if (mobileUserMenuButton) mobileUserMenuButton.addEventListener('click', toggleUserMenu);

    if (settingsLink) {
        settingsLink.addEventListener('click', (e) => {
            e.preventDefault();
            showPage('page-settings');
        });
    }
    if (logoutLink) {
        logoutLink.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = 'index.html';
        });
    }

    document.addEventListener('click', (e) => {
        if (window.innerWidth < 1024 && sidebar && sidebar.classList.contains('open') && !sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
            sidebar.classList.remove('open');
        }
        if (userMenu && !userMenu.classList.contains('hidden') && !userMenu.contains(e.target) && !userMenuButton.contains(e.target) && !mobileUserMenuButton.contains(e.target)) {
            userMenu.classList.add('hidden');
        }
    });
});


// ===================================================================================
// ============================= LÓGICA MAILCRAFT (COMPLETA Y CORREGIDA) ==============
// ===================================================================================
function initMailCraft() {
    const page = document.getElementById('page-mailcraft');
    if (!page) return;

    let templates = [];
    let activeTab = 'manual';
    let leadsQueue = [];
    let currentLeadIndex = 0;
    let lastFocusedEditor = null;
    let quillInstances = {};

    const defaultTemplates = [
        { name: "Bienvenida a WhitePress", subject: "¿Te gustaría conocer WhitePress? ✨", content: `<p>Hola {{nombre}},</p><p>Soy Eduardo de WhitePress. He notado que abriste recientemente una cuenta en la plataforma y escribo para saber si puedo ayudarte en algo. ¿Pudiste revisarla?</p><p>WhitePress es una plataforma enfocada en optimizar estrategias de link building. Colaboramos con miles de portales nacionales e internacionales, ofreciendo herramientas únicas para fortalecer y continuar tu SEO off-page.</p><p>Si estás de acuerdo, me gustaría coordinar una breve videollamada para entender mejor cómo puedo apoyarte en tu trabajo y explicarte en detalle los beneficios de trabajar con nosotros:</p><p><a href="https://example.com" target="_blank">Agendar videollamada</a></p><p>Quedo atento a tu respuesta.</p><p>Saludos,</p>` },
        { name: "Seguimiento y Demo", subject: "¿Aún no has tenido oportunidad de explorar WhitePress?", content: `<p>Buenos días {{nombre}},</p><p>Aquí Eduardo. Quería hacer un seguimiento rápido para saber si tuviste la oportunidad de explorar tu cuenta en WhitePress y me gustaría mostrarte cómo funciona en una demo muy rápida.</p><p>Además, durante la demo podemos activarte un cupón de 30 o incluso 50 euros para que puedas hacer una primera publicación y comprobar de primera mano la calidad de nuestros portales. </p><p>¿Te gustaría coordinar una breve llamada? Puedes reservar un momento aquí que te venga bien: <a href="https://example.com" target="_blank">Agendar Demo</a></p><p>Quedo atento y con gusto para resolver cualquier duda.</p><p>Saludos,</p>` }
    ];
    
    const placeholderKeys = ['nombre', 'apellido', 'email', 'empresa'];

    const dom = {
        templateSelector: page.querySelector('#mc-template-selector'),
        contactInfoInput: page.querySelector('#mc-contact-info'),
        generateBtn: page.querySelector('#mc-generate-btn'),
        generateBtnText: page.querySelector('#mc-generate-btn-text'),
        resultEmail: page.querySelector('#mc-result-email'),
        resultSubject: page.querySelector('#mc-result-subject'),
        resultBody: page.querySelector('#mc-result-body'),
        placeholderText: page.querySelector('#mc-placeholder-text'),
        copyEmailBtn: page.querySelector('#mc-copy-email-btn'),
        copyEmailBtnText: page.querySelector('#mc-copy-email-btn-text'),
        copySubjectBtn: page.querySelector('#mc-copy-subject-btn'),
        copySubjectBtnText: page.querySelector('#mc-copy-subject-btn-text'),
        copyBodyBtn: page.querySelector('#mc-copy-body-btn'),
        copyBodyBtnText: page.querySelector('#mc-copy-body-btn-text'),
        loadingSpinner: page.querySelector('#mc-loading-spinner'),
        resultContainer: page.querySelector('#mc-result-container'),
        templatesList: page.querySelector('#mc-templates-list'),
        addTemplateBtn: page.querySelector('#mc-add-template-btn'),
        tabManual: page.querySelector('#mc-tab-manual'),
        tabFile: page.querySelector('#mc-tab-file'),
        panelManual: page.querySelector('#mc-panel-manual'),
        panelFile: page.querySelector('#mc-panel-file'),
        fileUpload: page.querySelector('#mc-file-upload'),
        fileUploadUi: page.querySelector('#mc-file-upload-ui'),
        fileInfoUi: page.querySelector('#mc-file-info-ui'),
        fileName: page.querySelector('#mc-file-name'),
        leadCount: page.querySelector('#mc-lead-count'),
        downloadTemplateBtn: page.querySelector('#mc-download-template-btn'),
        placeholderTagsContainer: page.querySelector('#mc-placeholder-tags-container'),
        sendEmailBtn: page.querySelector('#mc-send-email-btn'),
    };
    
    const quillToolbarOptions = [['bold', 'italic'], ['link'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], ['clean']];

    const saveTemplatesToStorage = () => localStorage.setItem('emailGenTemplates_v5', JSON.stringify(templates));
    const loadTemplatesFromStorage = () => {
        const stored = localStorage.getItem('emailGenTemplates_v5');
        templates = stored ? JSON.parse(stored) : [...defaultTemplates];
        if (!stored) saveTemplatesToStorage();
    };
    
    function renderPlaceholderTags() {
        if(!dom.placeholderTagsContainer) return;
        dom.placeholderTagsContainer.innerHTML = placeholderKeys.map(key => `<button class="placeholder-tag bg-light-gray text-graphite text-sm font-semibold py-1 px-3 rounded-full cursor-pointer border border-gray-300" data-placeholder="{{${key}}}">{{${key}}}</button>`).join('');
    }

    function renderTemplates() {
        loadTemplatesFromStorage();
        const selectorOptions = [];
        const listItems = [];
        quillInstances = {};

        if (templates.length === 0) {
            dom.templatesList.innerHTML = `<p class="text-gray-500 text-center py-4">${App.i18n.getString('noTemplates')}</p>`;
            dom.templateSelector.innerHTML = `<option disabled selected>${App.i18n.getString('createTemplateFirst')}</option>`;
            dom.generateBtn.disabled = true;
            return;
        }
        
        dom.generateBtn.disabled = false;

        templates.forEach((template, index) => {
            const safeName = template.name.replace(/"/g, '&quot;');
            const safeSubject = template.subject.replace(/"/g, '&quot;');
            selectorOptions.push(`<option value="${index}">${safeName}</option>`);
            listItems.push(`
                <div class="border border-gray-200 rounded-lg bg-white">
                    <div class="template-header flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50">
                        <span class="font-semibold text-graphite">${template.name}</span>
                        <div class="flex items-center gap-3">
                            <button class="delete-btn p-1 text-gray-500 hover:text-magenta" data-index="${index}" title="Eliminar"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
                            <svg class="w-5 h-5 text-gray-500 transition-transform" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                        </div>
                    </div>
                    <div class="template-body bg-light-gray/50">
                        <div class="space-y-4">
                            <div><label class="block text-sm font-medium text-gray-600 mb-1">${App.i18n.getString('templateNameLabel')}</label><input type="text" value="${safeName}" class="template-name-input w-full p-2 border border-gray-300 rounded-lg" placeholder="${App.i18n.getString('templateNameLabel')}"></div>
                            <div><label class="block text-sm font-medium text-gray-600 mb-1">${App.i18n.getString('templateSubjectLabel')}</label><input type="text" value="${safeSubject}" class="template-subject-input w-full p-2 border border-gray-300 rounded-lg" placeholder="${App.i18n.getString('templateSubjectLabel')}"></div>
                            <div><label class="block text-sm font-medium text-gray-600 mb-1">${App.i18n.getString('templateBodyLabel')}</label><div class="template-content-editor bg-white" id="mc-editor-${index}"></div></div>
                            <div class="flex justify-end"><button class="save-template-btn py-2 px-4 bg-magenta text-white rounded-lg hover:bg-opacity-90 transition" data-index="${index}">${App.i18n.getString('saveChanges')}</button></div>
                        </div>
                    </div>
                </div>
            `);
        });

        dom.templateSelector.innerHTML = selectorOptions.join('');
        dom.templatesList.innerHTML = listItems.join('');
        initializeQuillEditors();
    }

    function initializeQuillEditors() {
        templates.forEach((template, index) => {
            const editorContainer = page.querySelector(`#mc-editor-${index}`);
            if (editorContainer) {
                const quill = new Quill(editorContainer, {
                    modules: { toolbar: quillToolbarOptions },
                    placeholder: App.i18n.getString('writeHere'),
                    theme: 'snow'
                });
                if (template.content && template.content !== '<p><br></p>') quill.root.innerHTML = template.content;
                quillInstances[index] = quill;
                quill.on('selection-change', (range) => { if (range) lastFocusedEditor = quill; });
            }
        });
    }

    function setupTemplateEventListeners() {
        if(!dom.templatesList) return;
        dom.templatesList.addEventListener('click', (e) => {
            const header = e.target.closest('.template-header');
            const deleteBtn = e.target.closest('.delete-btn');
            const saveBtn = e.target.closest('.save-template-btn');

            if (deleteBtn) {
                const index = parseInt(deleteBtn.dataset.index);
                const confirmMsg = App.i18n.getString('confirmDelete').replace('{templateName}', templates[index].name);
                if (confirm(confirmMsg)) {
                    templates.splice(index, 1);
                    saveTemplatesToStorage();
                    renderTemplates();
                }
                return;
            }

            if (saveBtn) {
                const index = parseInt(saveBtn.dataset.index);
                const container = saveBtn.closest('.template-body');
                const newName = container.querySelector('.template-name-input').value.trim();
                const newSubject = container.querySelector('.template-subject-input').value;
                const newContent = quillInstances[index].root.innerHTML;
                
                if (!newName) { alert(App.i18n.getString('templateNameEmpty')); return; }
                templates[index] = { name: newName, subject: newSubject, content: newContent };
                saveTemplatesToStorage();
                renderTemplates();
                alert(App.i18n.getString('templateSaved'));
                return;
            }

            if (header) {
                const body = header.nextElementSibling;
                body.classList.toggle('open');
                header.querySelector('svg:last-child').classList.toggle('rotate-180');
            }
        });
    }
    
    if(dom.addTemplateBtn) dom.addTemplateBtn.addEventListener('click', () => {
        const newTemplate = { name: App.i18n.getString('newTemplateName'), subject: App.i18n.getString('newTemplateSubject'), content: "<p><br></p>" };
        templates.unshift(newTemplate);
        saveTemplatesToStorage();
        renderTemplates();
        const firstAccordion = dom.templatesList.firstElementChild;
        if(firstAccordion) {
            firstAccordion.querySelector('.template-header')?.click();
            firstAccordion.querySelector('.template-name-input')?.select();
        }
    });
    
    if(dom.placeholderTagsContainer) dom.placeholderTagsContainer.addEventListener('click', (e) => {
        const tag = e.target.closest('.placeholder-tag');
        if (!tag || !lastFocusedEditor) return;
        const placeholder = tag.dataset.placeholder;
        const range = lastFocusedEditor.getSelection(true);
        lastFocusedEditor.insertText(range.index, placeholder, 'user');
    });

    if(dom.fileUpload) dom.fileUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                if (json.length > 0 && (!json[0].hasOwnProperty('nombre') || !json[0].hasOwnProperty('email'))) {
                    alert(App.i18n.getString('fileErrorEmail'));
                    resetFileState(); return;
                }
                leadsQueue = json;
                currentLeadIndex = 0;
                updateFileUI(file.name, leadsQueue.length);
            } catch (error) {
                alert(App.i18n.getString('fileReadError'));
                resetFileState();
            }
        };
        reader.readAsArrayBuffer(file);
    });
    
    function updateFileUI(fileName, leadCount) {
        dom.fileUploadUi.classList.add('hidden');
        dom.fileInfoUi.classList.remove('hidden');
        dom.fileName.textContent = fileName;
        if (leadCount > 0) {
            dom.leadCount.textContent = App.i18n.getString('leadsFound').replace('{count}', leadCount);
            dom.generateBtnText.textContent = App.i18n.getString('generateForLead').replace('{current}', 1).replace('{total}', leadCount);
            dom.generateBtn.disabled = false;
        } else {
            dom.leadCount.textContent = App.i18n.getString('fileEmpty');
            dom.generateBtn.disabled = true;
        }
    }

    function resetFileState() {
        leadsQueue = [];
        currentLeadIndex = 0;
        if (dom.fileUpload) dom.fileUpload.value = '';
        dom.fileUploadUi.classList.remove('hidden');
        dom.fileInfoUi.classList.add('hidden');
        dom.generateBtnText.textContent = App.i18n.getString('generateEmail');
        dom.generateBtn.disabled = templates.length === 0;
    }

    if(dom.downloadTemplateBtn) dom.downloadTemplateBtn.addEventListener('click', () => {
        const csvContent = "data:text/csv;charset=utf-8,nombre,apellido,email,empresa\nJuan,Perez,juan.perez@ejemplo.com,Tech Corp\nMaria,Garcia,maria.g@ejemplo.com,Innovate LLC";
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "plantilla_contactos.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    const populateTemplate = (template, data) => {
        let populatedSubject = template.subject;
        let populatedContent = template.content;
        const safeData = data || {};
        for (const key of placeholderKeys) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            const value = safeData[key] || '';
            populatedSubject = populatedSubject.replace(regex, value);
            populatedContent = populatedContent.replace(regex, value);
        }
        return { subject: populatedSubject, body: populatedContent };
    };

    async function simulateAIExtraction(text) {
        return new Promise(resolve => {
            setTimeout(() => {
                const extracted = { nombre: '', apellido: '', email: '', empresa: '' };
                const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
                if (emailMatch) { extracted.email = emailMatch[0]; text = text.replace(extracted.email, ''); }
                const companyMatch = text.match(/(?:en|at|de|CEO en|CTO de|en la empresa)\s+([A-Z][\w\s.&,]+)/i);
                if (companyMatch) { extracted.empresa = companyMatch[1].replace(/,$/, '').trim(); text = text.replace(companyMatch[0], ''); }
                const nameParts = text.replace(/,/g, ' ').trim().split(/\s+/).filter(Boolean);
                if (nameParts.length > 0) { extracted.nombre = nameParts[0]; if (nameParts.length > 1) extracted.apellido = nameParts.slice(1).join(' '); }
                resolve(extracted);
            }, 500);
        });
    }
    
    function setUiLoading(isLoading) {
        dom.generateBtn.disabled = isLoading;
        dom.loadingSpinner.classList.toggle('hidden', !isLoading);
        dom.resultContainer.classList.toggle('hidden', isLoading);
        dom.placeholderText.classList.add('hidden');
        if (isLoading) {
            dom.resultEmail.value = '';
            dom.resultSubject.value = '';
            dom.resultBody.innerHTML = '';
        }
        dom.copyEmailBtn.disabled = true;
        dom.copySubjectBtn.disabled = true;
        dom.copyBodyBtn.disabled = true;
        dom.sendEmailBtn.disabled = true;
    }

    async function handleGenerateClick() {
        loadTemplatesFromStorage();
        if (templates.length === 0) { alert(App.i18n.getString('createTemplateFirst')); return; }
        const selectedTemplate = templates[dom.templateSelector.value];
        let data;
        setUiLoading(true);

        if (activeTab === 'manual') {
            const rawText = dom.contactInfoInput.value.trim();
            if (!rawText) { alert(App.i18n.getString('pasteContactInfo')); setUiLoading(false); return; }
            data = await simulateAIExtraction(rawText);
        } else {
            if (leadsQueue.length === 0 || currentLeadIndex >= leadsQueue.length) {
                alert(App.i18n.getString('noMoreLeads')); resetFileState(); setUiLoading(false); return;
            }
            data = leadsQueue[currentLeadIndex];
            currentLeadIndex++;
            if (currentLeadIndex < leadsQueue.length) {
                dom.generateBtnText.textContent = App.i18n.getString('generateForLead').replace('{current}', currentLeadIndex + 1).replace('{total}', leadsQueue.length);
            } else { 
                dom.generateBtnText.textContent = App.i18n.getString('processFinished'); 
                dom.generateBtn.disabled = true; 
            }
        }

        setUiLoading(false);
        if (activeTab === 'manual' || currentLeadIndex < leadsQueue.length) dom.generateBtn.disabled = false;

        if (data) {
            const finalEmail = populateTemplate(selectedTemplate, data);
            dom.resultEmail.value = data.email || '';
            dom.resultSubject.value = finalEmail.subject;
            dom.resultBody.innerHTML = finalEmail.body;
            dom.copyEmailBtn.disabled = !data.email;
            dom.copySubjectBtn.disabled = false;
            dom.copyBodyBtn.disabled = false;
            dom.sendEmailBtn.disabled = !data.email;
        } else {
            dom.resultContainer.classList.remove('hidden');
            dom.placeholderText.textContent = App.i18n.getString('dataExtractionError');
            dom.placeholderText.classList.remove('hidden');
        }
    }
    
    function universalCopy(content, isHTML, button, buttonTextElement) {
        if (!content || button.disabled) return;
        const showSuccess = () => {
            const originalText = buttonTextElement.textContent;
            buttonTextElement.textContent = App.i18n.getString('copied');
            button.classList.add('bg-mint', 'text-white');
            setTimeout(() => { buttonTextElement.textContent = originalText; button.classList.remove('bg-mint', 'text-white'); }, 2000);
        };
        const listener = (e) => {
            e.preventDefault();
            if (isHTML) { e.clipboardData.setData('text/html', content); e.clipboardData.setData('text/plain', dom.resultBody.innerText); }
            else { e.clipboardData.setData('text/plain', content); }
        };
        document.addEventListener('copy', listener);
        try { document.execCommand('copy'); showSuccess(); } catch (err) { alert(App.i18n.getString('copyError')); }
        document.removeEventListener('copy', listener);
    }

    function handleSendEmail() {
        if (dom.sendEmailBtn.disabled) return;
        const to = dom.resultEmail.value;
        const subject = dom.resultSubject.value;
        const bodyAsPlainText = dom.resultBody.innerText;
        if (!to) { alert(App.i18n.getString('noEmailFound')); return; }
        const mailtoLink = `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyAsPlainText)}`;
        window.location.href = mailtoLink;
    }

    function switchTab(targetTab) {
        activeTab = targetTab;
        dom.tabManual.classList.toggle('active', targetTab === 'manual');
        dom.panelManual.classList.toggle('hidden', targetTab !== 'manual');
        dom.tabFile.classList.toggle('active', targetTab === 'file');
        dom.panelFile.classList.toggle('hidden', targetTab !== 'file');
        renderTemplates();
        if (targetTab === 'manual') resetFileState();
        else {
            if (leadsQueue.length > 0) {
                if (currentLeadIndex >= leadsQueue.length) { dom.generateBtnText.textContent = App.i18n.getString('processFinished'); dom.generateBtn.disabled = true; }
                else { dom.generateBtnText.textContent = App.i18n.getString('generateForLead').replace('{current}', currentLeadIndex + 1).replace('{total}', leadsQueue.length); dom.generateBtn.disabled = false; }
            } else dom.generateBtnText.textContent = App.i18n.getString('generateEmail');
        }
    }
    
    if(dom.tabManual) dom.tabManual.addEventListener('click', () => switchTab('manual'));
    if(dom.tabFile) dom.tabFile.addEventListener('click', () => switchTab('file'));
    if(dom.generateBtn) dom.generateBtn.addEventListener('click', handleGenerateClick);
    if(dom.copyEmailBtn) dom.copyEmailBtn.addEventListener('click', () => universalCopy(dom.resultEmail.value, false, dom.copyEmailBtn, dom.copyEmailBtnText));
    if(dom.copySubjectBtn) dom.copySubjectBtn.addEventListener('click', () => universalCopy(dom.resultSubject.value, false, dom.copySubjectBtn, dom.copySubjectBtnText));
    if(dom.copyBodyBtn) dom.copyBodyBtn.addEventListener('click', () => universalCopy(dom.resultBody.innerHTML, true, dom.copyBodyBtn, dom.copyBodyBtnText));
    if(dom.sendEmailBtn) dom.sendEmailBtn.addEventListener('click', handleSendEmail);
    
    renderPlaceholderTags();
    renderTemplates();
    setupTemplateEventListeners(); 
    switchTab('manual');
}

// ===================================================================================
// ============================= LÓGICA WHATSCRFT (COMPLETA Y CORREGIDA) ==============
// ===================================================================================
function initWhatsCraft() {
    const page = document.getElementById('page-whatscraft');
    if (!page) return;

    let templates = [];
    let lastFocusedEditor = null;
    let quillInstances = {};
    let activeTab = 'manual';
    let leadsQueue = [];
    let currentLeadIndex = 0;

    const defaultTemplates = [
        { name: "Contacto Inicial 👋", content: `<p>¡Hola {{nombre}}! ¿Cómo estás? Te escribo para...</p>` },
        { name: "Seguimiento 🚀", content: `<p>¡Hola de nuevo, {{nombre}}! Solo para dar seguimiento a nuestra conversación...</p>` }
    ];
    
    const placeholderKeys = ['nombre', 'apellido', 'email', 'empresa'];

    const dom = {
        templateSelector: page.querySelector('#wc-template-selector'),
        generateBtn: page.querySelector('#wc-generate-btn'),
        generateBtnText: page.querySelector('#wc-generate-btn-text'),
        resultLink: page.querySelector('#wc-result-link'),
        resultBody: page.querySelector('#wc-result-body'),
        placeholderText: page.querySelector('#wc-placeholder-text'),
        copyLinkBtn: page.querySelector('#wc-copy-link-btn'),
        copyLinkBtnText: page.querySelector('#wc-copy-link-btn-text'),
        goToLinkBtn: page.querySelector('#wc-go-to-link-btn'),
        copyBodyBtn: page.querySelector('#wc-copy-body-btn'),
        copyBodyBtnText: page.querySelector('#wc-copy-body-btn-text'),
        sendWhatsappBtn: page.querySelector('#wc-send-whatsapp-btn'),
        loadingSpinner: page.querySelector('#wc-loading-spinner'),
        resultContainer: page.querySelector('#wc-result-container'),
        templatesList: page.querySelector('#wc-templates-list'),
        addTemplateBtn: page.querySelector('#wc-add-template-btn'),
        placeholderTagsContainer: page.querySelector('#wc-placeholder-tags-container'),
        tabManual: page.querySelector('#wc-tab-manual'),
        tabFile: page.querySelector('#wc-tab-file'),
        panelManual: page.querySelector('#wc-panel-manual'),
        panelFile: page.querySelector('#wc-panel-file'),
        contactInfoInput: page.querySelector('#wc-contact-info'),
        fileUpload: page.querySelector('#wc-file-upload'),
        fileUploadUi: page.querySelector('#wc-file-upload-ui'),
        fileInfoUi: page.querySelector('#wc-file-info-ui'),
        fileName: page.querySelector('#wc-file-name'),
        leadCount: page.querySelector('#wc-lead-count'),
        downloadTemplateBtn: page.querySelector('#wc-download-template-btn'),
    };
    
    const quillToolbarOptions = [['bold', 'italic', 'strike'], ['clean']];

    const saveTemplatesToStorage = () => localStorage.setItem('whatscraft_templates_v4', JSON.stringify(templates));
    const loadTemplatesFromStorage = () => {
        const stored = localStorage.getItem('whatscraft_templates_v4');
        templates = stored ? JSON.parse(stored) : [...defaultTemplates];
        if(!stored) saveTemplatesToStorage();
    };
    
    function renderPlaceholderTags() {
        if(!dom.placeholderTagsContainer) return;
        dom.placeholderTagsContainer.innerHTML = placeholderKeys.map(key => `<button class="placeholder-tag transition bg-light-gray text-graphite text-sm font-semibold py-1 px-3 rounded-full cursor-pointer border border-gray-300" data-placeholder="{{${key}}}">{{${key}}}</button>`).join('');
    }

    function renderTemplates() {
        loadTemplatesFromStorage();
        const selectorOptions = [];
        const listItems = [];
        quillInstances = {}; 

        if (templates.length === 0) {
            dom.templatesList.innerHTML = `<p class="text-gray-500 text-center py-4">${App.i18n.getString('noTemplates')}</p>`;
            dom.templateSelector.innerHTML = `<option disabled selected>${App.i18n.getString('createTemplateFirst')}</option>`;
            dom.generateBtn.disabled = true;
            return;
        }
        
        dom.generateBtn.disabled = false;

        templates.forEach((template, index) => {
            const safeName = template.name.replace(/"/g, '&quot;');
            selectorOptions.push(`<option value="${index}">${safeName}</option>`);
            listItems.push(`
                <div class="border border-gray-200 rounded-lg bg-white">
                    <div class="template-header flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50">
                        <span class="font-semibold text-graphite">${template.name}</span>
                        <div class="flex items-center gap-3">
                            <button class="delete-btn p-1 text-gray-500 hover:text-red-600" data-index="${index}" title="Eliminar"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
                            <svg class="w-5 h-5 text-gray-500 transition-transform" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                        </div>
                    </div>
                    <div class="template-body bg-light-gray/50">
                        <div class="space-y-4">
                            <div><label class="block text-sm font-medium text-gray-600 mb-1">${App.i18n.getString('templateNameLabel')}</label><input type="text" value="${safeName}" class="template-name-input w-full p-2 border border-gray-300 rounded-lg" placeholder="${App.i18n.getString('templateNameLabel')}"></div>
                            <div><label class="block text-sm font-medium text-gray-600 mb-1">${App.i18n.getString('templateBodyLabel')}</label><div class="template-content-editor bg-white" id="wc-editor-${index}"></div></div>
                            <div class="flex justify-end"><button class="save-template-btn py-2 px-4 bg-whatsapp-dark text-white rounded-lg hover:bg-opacity-90 transition" data-index="${index}">${App.i18n.getString('saveChanges')}</button></div>
                        </div>
                    </div>
                </div>
            `);
        });

        dom.templateSelector.innerHTML = selectorOptions.join('');
        dom.templatesList.innerHTML = listItems.join('');
        initializeQuillEditors();
    }

    function initializeQuillEditors() {
        templates.forEach((template, index) => {
            const editorContainer = page.querySelector(`#wc-editor-${index}`);
            if (editorContainer) {
                const quill = new Quill(editorContainer, {
                    modules: { toolbar: quillToolbarOptions },
                    placeholder: App.i18n.getString('writeHere'),
                    theme: 'snow'
                });
                if (template.content) quill.root.innerHTML = template.content;
                quillInstances[index] = quill;
                quill.on('selection-change', (range) => { if (range) lastFocusedEditor = quill; });
            }
        });
    }

    function setupTemplateEventListeners() {
        if(!dom.templatesList) return;
        dom.templatesList.addEventListener('click', (e) => {
            const header = e.target.closest('.template-header');
            const deleteBtn = e.target.closest('.delete-btn');
            const saveBtn = e.target.closest('.save-template-btn');

            if (deleteBtn) {
                const index = parseInt(deleteBtn.dataset.index);
                const confirmMsg = App.i18n.getString('confirmDelete').replace('{templateName}', templates[index].name);
                if (confirm(confirmMsg)) {
                    templates.splice(index, 1);
                    saveTemplatesToStorage();
                    renderTemplates();
                }
                return;
            }

            if (saveBtn) {
                const index = parseInt(saveBtn.dataset.index);
                const container = saveBtn.closest('.template-body');
                const newName = container.querySelector('.template-name-input').value.trim();
                const newContent = quillInstances[index].root.innerHTML;
                if (!newName) { alert(App.i18n.getString('templateNameEmpty')); return; }
                templates[index] = { name: newName, content: newContent };
                saveTemplatesToStorage();
                renderTemplates();
                alert(App.i18n.getString('templateSaved'));
                return;
            }

            if (header) {
                const body = header.nextElementSibling;
                body.classList.toggle('open');
                header.querySelector('svg:last-child').classList.toggle('rotate-180');
            }
        });
    }
    
    if(dom.addTemplateBtn) dom.addTemplateBtn.addEventListener('click', () => {
        const newTemplate = { name: App.i18n.getString('newTemplateName') + ' ✨', content: `<p>${App.i18n.getString('newTemplateBodyWC')}</p>` };
        templates.unshift(newTemplate);
        saveTemplatesToStorage();
        renderTemplates();
        const firstAccordion = dom.templatesList.firstElementChild;
        if(firstAccordion) {
            firstAccordion.querySelector('.template-header')?.click();
            firstAccordion.querySelector('.template-name-input')?.select();
        }
    });
    
    if(dom.placeholderTagsContainer) dom.placeholderTagsContainer.addEventListener('click', (e) => {
        const tag = e.target.closest('.placeholder-tag');
        if (!tag || !lastFocusedEditor) return;
        const placeholder = tag.dataset.placeholder;
        const range = lastFocusedEditor.getSelection(true);
        lastFocusedEditor.insertText(range.index, placeholder, 'user');
    });

    function normalizePhoneNumber(phoneStr) {
        if (!phoneStr) return '';
        let phone = String(phoneStr).replace(/\D/g, '');
        if (String(phoneStr).trim().startsWith('+52 1')) phone = '521' + String(phoneStr).split('+52 1')[1].replace(/\D/g, '');
        else if (phone.length === 10) phone = '52' + phone;
        return phone;
    }

    async function extractDataFromText(text) {
        return new Promise(resolve => {
            setTimeout(() => {
                const extracted = { nombre: '', apellido: '', email: '', empresa: '', telefono: '' };
                let remainingText = text;
            
                // 1. Extraer y normalizar el número de teléfono
                const phoneRegex = /(?:[+\d]{1,4})?(?:[() \-.]*\d){8,}/g;
                const phoneMatches = remainingText.match(phoneRegex);
                if (phoneMatches) {
                    const phoneText = phoneMatches.sort((a, b) => b.length - a.length)[0];
                    extracted.telefono = normalizePhoneNumber(phoneText);
                    remainingText = remainingText.replace(phoneText, '');
                }
            
                // 2. Extraer email (similar a MailCraft)
                const emailMatch = remainingText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
                if (emailMatch) { 
                    extracted.email = emailMatch[0]; 
                    remainingText = remainingText.replace(extracted.email, ''); 
                }
            
                // 3. Extraer empresa (similar a MailCraft)
                const companyMatch = remainingText.match(/(?:en|at|de|CEO en|CTO de|en la empresa)\s+([A-Z][\w\s.&,]+)/i);
                if (companyMatch) { 
                    extracted.empresa = companyMatch[1].replace(/,$/, '').trim(); 
                    remainingText = remainingText.replace(companyMatch[0], ''); 
                }
            
                // 4. Lo que queda es el nombre y apellido
                const nameParts = remainingText.replace(/,/g, ' ').trim().split(/\s+/).filter(Boolean);
                if (nameParts.length > 0) { 
                    extracted.nombre = nameParts[0]; 
                    if (nameParts.length > 1) extracted.apellido = nameParts.slice(1).join(' '); 
                }
            
                resolve(extracted);
            }, 500); // Simula un pequeño delay como la extracción de IA
        });
    }
    function populateTemplate(template, data) {
        let populatedContent = template.content;
        const safeData = data || {};
        for (const key of placeholderKeys) {
            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
            const value = safeData[key] || '';
            populatedContent = populatedContent.replace(regex, value);
        }
        return { body: populatedContent };
    };
    
    function setUiLoading(isLoading) {
        dom.generateBtn.disabled = isLoading;
        dom.loadingSpinner.classList.toggle('hidden', !isLoading);
        dom.resultContainer.classList.toggle('hidden', isLoading);
        dom.placeholderText.classList.add('hidden');
        if (isLoading) { dom.resultLink.value = ''; dom.resultBody.innerHTML = ''; }
        dom.copyLinkBtn.disabled = true;
        dom.goToLinkBtn.disabled = true;
        dom.copyBodyBtn.disabled = true;
        dom.sendWhatsappBtn.disabled = true;
    }

    async function handleGenerateClick() {
        loadTemplatesFromStorage();
        if (templates.length === 0) { alert(App.i18n.getString('createTemplateFirst')); return; }
        const selectedTemplate = templates[dom.templateSelector.value];
        let data;
        setUiLoading(true);

        if (activeTab === 'manual') {
            const rawText = dom.contactInfoInput.value.trim();
            if (!rawText) { alert(App.i18n.getString('pasteContactInfo')); setUiLoading(false); return; }
            data = await extractDataFromText(rawText); // Se añade await
        } else {
            if (leadsQueue.length === 0 || currentLeadIndex >= leadsQueue.length) {
                alert(App.i18n.getString('noMoreLeads')); resetFileState(); setUiLoading(false); return;
            }
            const lead = leadsQueue[currentLeadIndex];
            // Se asegura de procesar todos los campos del archivo
            data = { 
                nombre: lead.nombre || 'Lead',
                apellido: lead.apellido || '',
                email: lead.email || '',
                empresa: lead.empresa || '',
                telefono: normalizePhoneNumber(lead.telefono || '') 
            };
            currentLeadIndex++;
            if (currentLeadIndex < leadsQueue.length) {
                dom.generateBtnText.textContent = App.i18n.getString('generateForLead').replace('{current}', currentLeadIndex + 1).replace('{total}', leadsQueue.length);
            } else { 
                dom.generateBtnText.textContent = App.i18n.getString('processFinished');
                dom.generateBtn.disabled = true;                
            }
        }
        
        // setTimeout(() => { Eliminar esta linea: La nueva función ya simula un delay.
            setUiLoading(false);
            if (activeTab === 'manual' || currentLeadIndex < leadsQueue.length) dom.generateBtn.disabled = false;
            if (data && data.telefono) {
                const finalMessage = populateTemplate(selectedTemplate, data);
                dom.resultLink.value = `wa.me/${data.telefono}`;
                dom.resultBody.innerHTML = finalMessage.body;
                dom.copyLinkBtn.disabled = false;
                dom.goToLinkBtn.disabled = false;
                dom.copyBodyBtn.disabled = false;
                dom.sendWhatsappBtn.disabled = false;
            } else {
                dom.resultContainer.classList.remove('hidden');
                dom.placeholderText.textContent = App.i18n.getString('noPhoneNumberFound');
                dom.placeholderText.classList.remove('hidden');
                dom.resultLink.value = '';
                dom.resultBody.innerHTML = '';
            }
        // }, 300); Eliminar esta linea: La nueva función ya simula un delay.
    }
    
    function copyToClipboard(textToCopy, button, buttonTextElement) {
        if (!textToCopy || button.disabled) return;
        const showSuccess = () => {
            const originalText = buttonTextElement.textContent;
            buttonTextElement.textContent = App.i18n.getString('copied');
            button.classList.add('bg-whatsapp-green', 'text-white');
            setTimeout(() => { buttonTextElement.textContent = originalText; button.classList.remove('bg-whatsapp-green', 'text-white'); }, 2000);
        };
        const textArea = document.createElement("textarea");
        textArea.value = textToCopy;
        textArea.style.position = "fixed"; textArea.style.left = "-9999px";
        document.body.appendChild(textArea);
        textArea.focus(); textArea.select();
        try { document.execCommand('copy'); showSuccess(); } catch (err) { alert(App.i18n.getString('copyError')); }
        document.body.removeChild(textArea);
    }

    function handleGoToLink() {
        if(dom.goToLinkBtn.disabled) return;
        const link = dom.resultLink.value;
        if(link) window.open(`https://${link}`, '_blank');
    }


    function handleSendWhatsapp() {
        if(dom.sendWhatsappBtn.disabled) return;
        const phoneNumber = dom.resultLink.value.replace('wa.me/', '');
        const messageText = dom.resultBody.innerText;
        if (!phoneNumber || !messageText) return;
        const finalUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(messageText)}`;
        window.open(finalUrl, '_blank');
    }
    
    if(dom.fileUpload) dom.fileUpload.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const workbook = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(worksheet, { defval: "", codepage: 65001 });
                if (json.length > 0 && (!json[0].hasOwnProperty('nombre') || !json[0].hasOwnProperty('telefono'))) {
                    alert(App.i18n.getString('fileErrorWhatsapp'));
                    resetFileState(); return;
                }
                leadsQueue = json;
                currentLeadIndex = 0;
                updateFileUI(file.name, leadsQueue.length);
            } catch (error) {
                alert(App.i18n.getString('fileReadError'));
                resetFileState();
            }
        };
        reader.readAsArrayBuffer(file);
    });
    
    function updateFileUI(fileName, leadCount) {
        dom.fileUploadUi.classList.add('hidden');
        dom.fileInfoUi.classList.remove('hidden');
        dom.fileName.textContent = fileName;
        if (leadCount > 0) {
            dom.leadCount.textContent = App.i18n.getString('leadsFound').replace('{count}', leadCount);
            dom.generateBtnText.textContent = App.i18n.getString('generateForLead').replace('{current}', 1).replace('{total}', leadCount);
            dom.generateBtn.disabled = false;
        } else {
            dom.leadCount.textContent = App.i18n.getString('fileEmpty');
            dom.generateBtn.disabled = true;
        }
    }

    function resetFileState() {
        leadsQueue = [];
        currentLeadIndex = 0;
        if(dom.fileUpload) dom.fileUpload.value = '';
        dom.fileUploadUi.classList.remove('hidden');
        dom.fileInfoUi.classList.add('hidden');
        dom.generateBtnText.textContent = App.i18n.getString('generateLink');
        dom.generateBtn.disabled = templates.length === 0;
    }

    if(dom.downloadTemplateBtn) dom.downloadTemplateBtn.addEventListener('click', () => {
        const csvContent = "data:text/csv;charset=utf-8,nombre,telefono\nJuan Perez,34612345678\nAna,+54 9 11 1234-5678";
        const link = document.createElement("a");
        link.setAttribute("href", encodeURI(csvContent));
        link.setAttribute("download", "plantilla_leads_whatsapp.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    function switchTab(targetTab) {
        activeTab = targetTab;
        dom.tabManual.classList.toggle('active', targetTab === 'manual');
        dom.panelManual.classList.toggle('hidden', targetTab !== 'manual');
        dom.tabFile.classList.toggle('active', targetTab === 'file');
        dom.panelFile.classList.toggle('hidden', targetTab !== 'file');
        renderTemplates();
        if (targetTab === 'manual') resetFileState();
        else {
            if (leadsQueue.length > 0) {
                 if (currentLeadIndex >= leadsQueue.length) { dom.generateBtnText.textContent = App.i18n.getString('processFinished'); dom.generateBtn.disabled = true; }
                 else { dom.generateBtnText.textContent = App.i18n.getString('generateForLead').replace('{current}', currentLeadIndex + 1).replace('{total}', leadsQueue.length); dom.generateBtn.disabled = false; }
            } else dom.generateBtnText.textContent = App.i18n.getString('generateLink');
        }
    }

    if(dom.tabManual) dom.tabManual.addEventListener('click', () => switchTab('manual'));
    if(dom.tabFile) dom.tabFile.addEventListener('click', () => switchTab('file'));
    if(dom.generateBtn) dom.generateBtn.addEventListener('click', handleGenerateClick);
    if(dom.copyLinkBtn) dom.copyLinkBtn.addEventListener('click', () => copyToClipboard(dom.resultLink.value, dom.copyLinkBtn, dom.copyLinkBtnText));
    if(dom.goToLinkBtn) dom.goToLinkBtn.addEventListener('click', handleGoToLink);
    if(dom.copyBodyBtn) dom.copyBodyBtn.addEventListener('click', () => copyToClipboard(dom.resultBody.innerText, dom.copyBodyBtn, dom.copyBodyBtnText));
    if(dom.sendWhatsappBtn) dom.sendWhatsappBtn.addEventListener('click', handleSendWhatsapp);
    
    renderPlaceholderTags();
    renderTemplates();
    setupTemplateEventListeners(); 
    switchTab('manual');
}


// ===================================================================================
// ========================= LÓGICA GESTOR DE PLANTILLAS (COMPLETA Y CORREGIDA) =======
// ===================================================================================
function initTemplatesPage() {
    const page = document.getElementById('page-templates');
    if (!page) return;

    let mcTemplates = [];
    let wcTemplates = [];
    let mcQuillInstances = {};
    let wcQuillInstances = {};
    let filterText = '';

    const dom = {
        searchInput: page.querySelector('#template-search-input'),
        mcList: page.querySelector('#manager-mc-templates-list'),
        wcList: page.querySelector('#manager-wc-templates-list'),
    };

    const mcQuillToolbarOptions = [['bold', 'italic'], ['link'], [{ 'list': 'ordered'}, { 'list': 'bullet' }], ['clean']];
    const wcQuillToolbarOptions = [['bold', 'italic', 'strike'], ['clean']];

    const loadMcTemplates = () => { mcTemplates = JSON.parse(localStorage.getItem('emailGenTemplates_v5') || '[]'); };
    const saveMcTemplates = () => { localStorage.setItem('emailGenTemplates_v5', JSON.stringify(mcTemplates)); };
    const loadWcTemplates = () => { wcTemplates = JSON.parse(localStorage.getItem('whatscraft_templates_v4') || '[]'); };
    const saveWcTemplates = () => { localStorage.setItem('whatscraft_templates_v4', JSON.stringify(wcTemplates)); };

    function render() {
        loadMcTemplates();
        loadWcTemplates();
        
        mcQuillInstances = {};
        wcQuillInstances = {};

        const filteredMc = mcTemplates.filter(t => t.name.toLowerCase().includes(filterText));
        dom.mcList.innerHTML = filteredMc.length ? filteredMc.map((template, originalIndex) => {
            const safeName = template.name.replace(/"/g, '&quot;');
            const safeSubject = template.subject.replace(/"/g, '&quot;');
            const originalIdx = mcTemplates.findIndex(t => t === template);
            return `
                <div class="border border-gray-200 rounded-lg bg-white">
                    <div class="template-header flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50">
                        <span class="font-semibold text-graphite">${template.name}</span>
                        <div class="flex items-center gap-3">
                            <button class="delete-btn p-1 text-gray-500 hover:text-magenta" data-type="mc" data-index="${originalIdx}" title="Eliminar"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
                            <svg class="w-5 h-5 text-gray-500 transition-transform" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                        </div>
                    </div>
                    <div class="template-body bg-light-gray/50">
                        <div class="space-y-4">
                            <div><label class="block text-sm font-medium text-gray-600 mb-1">${App.i18n.getString('nameLabel')}</label><input type="text" value="${safeName}" class="template-name-input w-full p-2 border border-gray-300 rounded-lg"></div>
                            <div><label class="block text-sm font-medium text-gray-600 mb-1">${App.i18n.getString('subject')}</label><input type="text" value="${safeSubject}" class="template-subject-input w-full p-2 border border-gray-300 rounded-lg"></div>
                            <div><label class="block text-sm font-medium text-gray-600 mb-1">${App.i18n.getString('emailBody')}</label><div class="template-content-editor bg-white" id="manager-mc-editor-${originalIdx}"></div></div>
                            <div class="flex justify-end"><button class="save-template-btn py-2 px-4 bg-magenta text-white rounded-lg hover:bg-opacity-90" data-type="mc" data-index="${originalIdx}">${App.i18n.getString('saveChanges')}</button></div>
                        </div>
                    </div>
                </div>`;
        }).join('') : `<p class="text-gray-500 text-center py-4">${App.i18n.getString('noTemplatesFound')}</p>`;

        const filteredWc = wcTemplates.filter(t => t.name.toLowerCase().includes(filterText));
        dom.wcList.innerHTML = filteredWc.length ? filteredWc.map((template, originalIndex) => {
            const safeName = template.name.replace(/"/g, '&quot;');
            const originalIdx = wcTemplates.findIndex(t => t === template);
            return `
                <div class="border border-gray-200 rounded-lg bg-white">
                     <div class="template-header flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50">
                        <span class="font-semibold text-graphite">${template.name}</span>
                        <div class="flex items-center gap-3">
                            <button class="delete-btn p-1 text-gray-500 hover:text-red-600" data-type="wc" data-index="${originalIdx}" title="Eliminar"><svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg></button>
                            <svg class="w-5 h-5 text-gray-500 transition-transform" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                        </div>
                    </div>
                    <div class="template-body bg-light-gray/50">
                        <div class="space-y-4">
                            <div><label class="block text-sm font-medium text-gray-600 mb-1">${App.i18n.getString('nameLabel')}</label><input type="text" value="${safeName}" class="template-name-input w-full p-2 border border-gray-300 rounded-lg"></div>
                            <div><label class="block text-sm font-medium text-gray-600 mb-1">${App.i18n.getString('whatsappMessage')}</label><div class="template-content-editor bg-white" id="manager-wc-editor-${originalIdx}"></div></div>
                            <div class="flex justify-end"><button class="save-template-btn py-2 px-4 bg-whatsapp-dark text-white rounded-lg hover:bg-opacity-90" data-type="wc" data-index="${originalIdx}">${App.i18n.getString('saveChanges')}</button></div>
                        </div>
                    </div>
                </div>`;
        }).join('') : `<p class="text-gray-500 text-center py-4">${App.i18n.getString('noTemplatesFound')}</p>`;

        initializeQuillEditors();
    }

    function initializeQuillEditors() {
        mcTemplates.forEach((template, index) => {
            const editorContainer = page.querySelector(`#manager-mc-editor-${index}`);
            if (editorContainer) {
                mcQuillInstances[index] = new Quill(editorContainer, {
                    modules: { toolbar: mcQuillToolbarOptions }, theme: 'snow'
                });
                if (template.content) mcQuillInstances[index].root.innerHTML = template.content;
            }
        });
        wcTemplates.forEach((template, index) => {
            const editorContainer = page.querySelector(`#manager-wc-editor-${index}`);
            if (editorContainer) {
                wcQuillInstances[index] = new Quill(editorContainer, {
                    modules: { toolbar: wcQuillToolbarOptions }, theme: 'snow'
                });
                if (template.content) wcQuillInstances[index].root.innerHTML = template.content;
            }
        });
    }
    
    function handleListClick(e) {
        const header = e.target.closest('.template-header');
        const deleteBtn = e.target.closest('.delete-btn');
        const saveBtn = e.target.closest('.save-template-btn');

        if (header) {
            const body = header.nextElementSibling;
            body.classList.toggle('open');
            header.querySelector('svg:last-child').classList.toggle('rotate-180');
        }

        if (deleteBtn) {
            const type = deleteBtn.dataset.type;
            const index = parseInt(deleteBtn.dataset.index);
            if (type === 'mc') {
                const confirmMsg = App.i18n.getString('confirmDelete').replace('{templateName}', mcTemplates[index].name);
                if (confirm(confirmMsg)) {
                    mcTemplates.splice(index, 1);
                    saveMcTemplates();
                    render();
                }
            } else if (type === 'wc') {
                const confirmMsg = App.i18n.getString('confirmDelete').replace('{templateName}', wcTemplates[index].name);
                if (confirm(confirmMsg)) {
                    wcTemplates.splice(index, 1);
                    saveWcTemplates();
                    render();
                }
            }
        }

        if (saveBtn) {
            const type = saveBtn.dataset.type;
            const index = parseInt(saveBtn.dataset.index);
            const container = saveBtn.closest('.template-body');
            const newName = container.querySelector('.template-name-input').value.trim();
            if (!newName) { alert(App.i18n.getString('templateNameEmpty')); return; }

            if (type === 'mc') {
                const newSubject = container.querySelector('.template-subject-input').value;
                const newContent = mcQuillInstances[index].root.innerHTML;
                mcTemplates[index] = { name: newName, subject: newSubject, content: newContent };
                saveMcTemplates();
            } else if (type === 'wc') {
                const newContent = wcQuillInstances[index].root.innerHTML;
                wcTemplates[index] = { name: newName, content: newContent };
                saveWcTemplates();
            }
            alert(App.i18n.getString('templateSaved'));
            render();
        }
    }

    if(dom.searchInput) dom.searchInput.addEventListener('input', (e) => {
        filterText = e.target.value.toLowerCase();
        render();
    });

    if(dom.mcList) dom.mcList.addEventListener('click', handleListClick);
    if(dom.wcList) dom.wcList.addEventListener('click', handleListClick);

    App.refreshTemplatesView = render;
    render();
}

// ===================================================================================
// ============================= LÓGICA AJUSTES (COMPLETA Y CORREGIDA) ================
// ===================================================================================
function initSettingsPage() {
    const page = document.getElementById('page-settings');
    if (!page) return;

    const saveProfileBtn = page.querySelector('#save-profile-btn');
    const updatePasswordBtn = page.querySelector('#update-password-btn');

    if(saveProfileBtn) saveProfileBtn.addEventListener('click', () => {
        alert(App.i18n.getString('profileSaved'));
    });

    if(updatePasswordBtn) updatePasswordBtn.addEventListener('click', () => {
        alert(App.i18n.getString('passwordUpdated'));
    });
}