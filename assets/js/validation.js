document.addEventListener('DOMContentLoaded', () => {
    const TARGET_EMAIL = 'zelinskydenus@gmail.com';

    // Чистий URL без #hash при кліку на якірні посилання
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const targetId = anchor.getAttribute('href');
            if (!targetId || targetId === '#') return;

            const targetEl = document.querySelector(targetId);
            if (targetEl) {
                e.preventDefault();
                targetEl.scrollIntoView({ behavior: 'smooth' });
                if (window.location.hash) {
                    history.replaceState(null, '', window.location.pathname + window.location.search);
                }
            }
        });
    });

    if (window.location.hash) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
    }

    // Тема
    const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');
    const htmlEl = document.documentElement;

    function updateThemeIcons(isDark) {
        themeToggleBtns.forEach(btn => {
            const icon = btn.querySelector('i');
            const text = btn.querySelector('span');
            const isMobileFull = btn.classList.contains('w-full');
            if (isDark) {
                if (icon) icon.className = 'fas fa-sun text-amber-400 text-xs';
                if (text) text.textContent = isMobileFull ? 'Світла тема' : 'Тема';
            } else {
                if (icon) icon.className = 'fas fa-moon text-accent-text dark:text-accent text-xs';
                if (text) text.textContent = isMobileFull ? 'Темна тема' : 'Тема';
            }
        });
    }

    themeToggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            htmlEl.classList.toggle('dark');
            const isDark = htmlEl.classList.contains('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            updateThemeIcons(isDark);
        });
    });

    updateThemeIcons(htmlEl.classList.contains('dark'));

    // Автозакриття мобільного бургер-меню
    const menuToggle = document.getElementById('menu-toggle');
    const mainNav = document.getElementById('main-nav');

    if (menuToggle && mainNav) {
        mainNav.querySelectorAll('a, .theme-toggle-btn').forEach(el => {
            el.addEventListener('click', () => {
                menuToggle.checked = false;
            });
        });

        document.addEventListener('click', (e) => {
            if (menuToggle.checked && !e.target.closest('header')) {
                menuToggle.checked = false;
            }
        });
    }

    // Курс НБУ
    let currentUsdRate = 41.50;
    let isCalculated = false;

    async function fetchNbuRate() {
        try {
            const now = new Date();
            const yyyy = now.getFullYear();
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const todayParam = `${yyyy}${mm}${dd}`;

            const response = await fetch(`https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&date=${todayParam}&json`);
            if (response.ok) {
                const data = await response.json();
                if (data?.[0]?.rate) {
                    currentUsdRate = parseFloat(data[0].rate);
                    const rateValEl = document.getElementById('nbu-rate-val');
                    const dateValEl = document.getElementById('nbu-date-val');
                    if (rateValEl) rateValEl.textContent = `${currentUsdRate.toFixed(2)} ₴`;
                    if (dateValEl) dateValEl.textContent = `НБУ (${data[0].exchangedate})`;
                    if (isCalculated) renderCalculation(false, false);
                }
            }
        } catch {
            // Залишаємо резервний курс
        }
    }
    fetchNbuRate();

    // Калькулятор вартості
    const MIN_AREA = 15;
    const MAX_AREA = 500;
    const DEFAULT_AREA = 120;

    const areaInput = document.getElementById('calc-area');
    const areaRange = document.getElementById('calc-area-range');
    const areaErrorEl = document.getElementById('calc-area-error');
    const typeRadios = document.querySelectorAll('input[name="calc-type-radio"]');
    const tariffSelect = document.getElementById('calc-tariff');

    const optSupervision = document.getElementById('calc-opt-supervision');
    const optSmartHome = document.getElementById('calc-opt-smarthome');
    const optUrgent = document.getElementById('calc-opt-urgent');

    const submitWrapper = document.getElementById('calc-submit-wrapper');
    const submitBtn = document.getElementById('calc-submit-btn');
    const btnIcon = document.getElementById('calc-btn-icon');
    const btnText = document.getElementById('calc-btn-text');

    const resultBox = document.getElementById('calc-result-box');
    const totalUsdEl = document.getElementById('calc-total-usd');
    const totalUahEl = document.getElementById('calc-total-uah');
    const breakdownEl = document.getElementById('calc-breakdown-text');

    const transferBtn = document.getElementById('calc-transfer-btn');
    const exportBtn = document.getElementById('calc-export-btn');

    let isAnimating = false;

    function setAreaError(hasError, message = '') {
        if (!areaInput) return;
        if (hasError) {
            areaInput.classList.add('border-red-500', 'dark:border-red-500');
            areaInput.classList.remove('border-accent/40');
            areaInput.setAttribute('aria-invalid', 'true');
            if (areaErrorEl) {
                const span = areaErrorEl.querySelector('span');
                if (span && message) span.textContent = message;
                areaErrorEl.classList.remove('hidden');
            }
        } else {
            areaInput.classList.remove('border-red-500', 'dark:border-red-500');
            areaInput.classList.add('border-accent/40');
            areaInput.setAttribute('aria-invalid', 'false');
            if (areaErrorEl) areaErrorEl.classList.add('hidden');
        }
    }

    function getSanitizedArea(normalizeField = false) {
        if (!areaInput) return DEFAULT_AREA;
        const raw = String(areaInput.value ?? '').trim();

        if (raw === '') {
            setAreaError(true, `Вкажіть площу (мінімум ${MIN_AREA} м²)`);
            if (normalizeField) {
                areaInput.value = String(MIN_AREA);
                setAreaError(false);
            }
            if (areaRange) areaRange.value = String(MIN_AREA);
            return MIN_AREA;
        }

        const parsed = Number(raw);
        if (!Number.isFinite(parsed)) {
            setAreaError(true, 'Введіть коректне числове значення');
            if (normalizeField) {
                areaInput.value = String(DEFAULT_AREA);
                setAreaError(false);
            }
            if (areaRange) areaRange.value = String(DEFAULT_AREA);
            return DEFAULT_AREA;
        }

        let safeArea = Math.round(parsed);
        let hasWarning = parsed !== safeArea;
        let warningMsg = hasWarning ? `Дробове значення округлено до ${safeArea} м²` : '';

        if (safeArea < MIN_AREA) {
            safeArea = MIN_AREA;
            hasWarning = true;
            warningMsg = `Мінімальна площа — ${MIN_AREA} м²`;
        } else if (safeArea > MAX_AREA) {
            safeArea = MAX_AREA;
            hasWarning = true;
            warningMsg = `Максимальна площа — ${MAX_AREA} м²`;
        }

        setAreaError(hasWarning, warningMsg);

        if (normalizeField) {
            areaInput.value = String(safeArea);
            setAreaError(false);
        }
        if (areaRange) areaRange.value = String(safeArea);

        return safeArea;
    }

    function calculateCost(normalizeField = false) {
        const area = getSanitizedArea(normalizeField);

        const selectedTypeRadio = document.querySelector('input[name="calc-type-radio"]:checked');
        const typeCoeff = parseFloat(selectedTypeRadio?.dataset?.coeff) || 1.0;
        const typeName = selectedTypeRadio?.value === 'house'
            ? 'Приватний будинок'
            : selectedTypeRadio?.value === 'commercial'
                ? 'Комерція'
                : 'Квартира';

        const selectedTariffOpt = tariffSelect.options[tariffSelect.selectedIndex];
        const tariffPrice = parseFloat(selectedTariffOpt?.dataset?.price) || 35;
        const tariffName = selectedTariffOpt.text.split('—')[0].trim();

        const baseCost = area * tariffPrice * typeCoeff;
        const supervisionCost = optSupervision?.checked ? baseCost * 0.20 : 0;
        const smartHomeCost = optSmartHome?.checked ? 500 : 0;
        const urgentCost = optUrgent?.checked ? baseCost * 0.15 : 0;

        const totalUsd = Math.round(baseCost + supervisionCost + smartHomeCost + urgentCost);
        const totalUah = Math.round(totalUsd * currentUsdRate);

        return {
            area,
            typeName,
            tariffName,
            tariffPrice,
            totalUsd,
            totalUah,
            supervision: Boolean(optSupervision?.checked),
            smartHome: Boolean(optSmartHome?.checked),
            urgent: Boolean(optUrgent?.checked)
        };
    }

    function renderCalculation(normalizeField = false, revealBox = false) {
        if (!areaInput || !tariffSelect || !totalUsdEl || !totalUahEl) return;

        const data = calculateCost(normalizeField);

        totalUsdEl.textContent = `$${data.totalUsd.toLocaleString('uk-UA')}`;
        totalUahEl.textContent = `(~ ${data.totalUah.toLocaleString('uk-UA')} ₴)`;

        if (breakdownEl) {
            const optionsList = [
                data.supervision ? 'Авторський нагляд (+20%)' : '',
                data.smartHome ? 'Smart Home (+$500)' : '',
                data.urgent ? 'Терміновість (+15%)' : ''
            ].filter(Boolean).join(', ') || 'Без доп. опцій';

            breakdownEl.innerHTML = `
                <div class="flex justify-between"><span>• Об'єкт & Площа:</span><span class="font-bold text-main-text dark:text-white">${data.typeName}, ${data.area} м²</span></div>
                <div class="flex justify-between"><span>• Тариф:</span><span class="font-bold text-main-text dark:text-white">${data.tariffName} ($${data.tariffPrice}/м²)</span></div>
                <div class="flex justify-between"><span>• Опції:</span><span class="font-bold text-main-text dark:text-white">${optionsList}</span></div>
            `;
        }

        if (revealBox && resultBox) {
            requestAnimationFrame(() => {
                resultBox.classList.remove('grid-rows-[0fr]', 'opacity-0', 'translate-y-2', 'pointer-events-none');
                resultBox.classList.add('grid-rows-[1fr]', 'opacity-100', 'translate-y-0');
            });
        }
    }

    function handleLiveUpdate(normalizeField = false) {
        getSanitizedArea(normalizeField);
        if (!isCalculated) return;
        renderCalculation(normalizeField, false);
    }

    if (areaInput) {
        areaInput.addEventListener('input', () => handleLiveUpdate(false));
        areaInput.addEventListener('blur', () => handleLiveUpdate(true));
    }

    if (areaRange) {
        areaRange.addEventListener('input', () => {
            if (areaInput) areaInput.value = areaRange.value;
            setAreaError(false);
            if (isCalculated) renderCalculation(false, false);
        });
    }

    typeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (isCalculated) renderCalculation(false, false);
        });
    });

    if (tariffSelect) {
        tariffSelect.addEventListener('change', () => {
            if (isCalculated) renderCalculation(false, false);
        });
    }

    [optSupervision, optSmartHome, optUrgent].forEach(checkbox => {
        if (checkbox) {
            checkbox.addEventListener('change', () => {
                if (isCalculated) renderCalculation(false, false);
            });
        }
    });

    if (submitBtn) {
        submitBtn.addEventListener('click', () => {
            if (isAnimating || isCalculated) return;
            isAnimating = true;

            submitBtn.classList.remove('bg-[#B8502B]', 'hover:bg-[#9A3E20]');
            submitBtn.classList.add('bg-gray-700', 'pointer-events-none');
            if (btnIcon) btnIcon.className = 'fas fa-spinner fa-spin text-base';
            if (btnText) btnText.textContent = 'Розраховуємо...';

            setTimeout(() => {
                isCalculated = true;
                renderCalculation(true, true);

                submitBtn.classList.remove('bg-gray-700');
                submitBtn.classList.add('bg-emerald-700');
                if (btnIcon) btnIcon.className = 'fas fa-check text-base';
                if (btnText) btnText.textContent = 'Вартість розраховано!';

                setTimeout(() => {
                    if (submitWrapper) {
                        submitWrapper.classList.remove('grid-rows-[1fr]', 'opacity-100', 'scale-100');
                        submitWrapper.classList.add('grid-rows-[0fr]', 'opacity-0', 'scale-95', 'pointer-events-none');
                        setTimeout(() => {
                            submitWrapper.classList.add('hidden');
                            isAnimating = false;
                        }, 520);
                    } else {
                        isAnimating = false;
                    }
                }, 650);
            }, 450);
        });
    }

    if (transferBtn) {
        transferBtn.addEventListener('click', () => {
            const data = calculateCost(true);
            const messageInput = document.getElementById('message');
            const subjectSelect = document.getElementById('subject');
            const consultationSection = document.getElementById('consultation');

            if (messageInput) {
                messageInput.value = `Доброго дня! Цікавить проєкт за розрахованим кошторисом:\n- Тип об'єкта: ${data.typeName}\n- Площа: ${data.area} м²\n- Пакет: ${data.tariffName}\n- Розрахована вартість: $${data.totalUsd.toLocaleString('uk-UA')} (~${data.totalUah.toLocaleString('uk-UA')} ₴).`;
                messageInput.dispatchEvent(new Event('input', { bubbles: true }));
            }

            if (subjectSelect) subjectSelect.value = 'Безкоштовна консультація';
            if (consultationSection) consultationSection.scrollIntoView({ behavior: 'smooth' });
        });
    }

    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            const data = calculateCost(true);
            const textContent =
`==================================================
  АРХІТЕКТУРНЕ БЮРО «НОВИЙ ПРОСТІР»
  Попередній розрахунок кошторису проєкту
==================================================

Дата розрахунку: ${new Date().toLocaleDateString('uk-UA')}
Курс NBU (USD/UAH): ${currentUsdRate.toFixed(2)} ₴

ПАРАМЕТРИ ОБ'ЄКТА:
--------------------------------------------------
• Площа приміщення: ${data.area} м²
• Тип нерухомості:  ${data.typeName}
• Обраний тариф:     ${data.tariffName} ($${data.tariffPrice}/м²)

ДОДАТКОВІ ОПЦІЇ:
--------------------------------------------------
• Авторський нагляд: ${data.supervision ? 'Включено (+20%)' : 'Ні'}
• Система Smart Home: ${data.smartHome ? 'Включено (+$500)' : 'Ні'}
• Термінова розробка: ${data.urgent ? 'Включено (+15%)' : 'Ні'}

==================================================
ПІДСУМКОВА ВАРТІСТЬ:
$${data.totalUsd.toLocaleString('uk-UA')} USD  (~ ${data.totalUah.toLocaleString('uk-UA')} UAH)
==================================================

Контакти бюро «Новий простір»:
Телефон: +38 (067) 342-89-15
Email: ${TARGET_EMAIL}
Адреса: м. Львів, вул. Архітекторів, 12
`;

            const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Koshtorys_NovyProstir_${data.area}m2.txt`;
            link.click();
            URL.revokeObjectURL(link.href);
        });
    }

    // Форма зворотного зв'язку
    const form = document.getElementById('feedback-form');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const subjectSelect = document.getElementById('subject');
    const messageInput = document.getElementById('message');
    const agreementCheckbox = document.getElementById('agreement');
    const charCounter = document.getElementById('char-counter');

    const modal = document.getElementById('success-modal');
    const modalCard = document.getElementById('modal-card');
    const closeModalBtn = document.getElementById('close-modal');
    const summaryName = document.getElementById('summary-name');
    const summaryEmail = document.getElementById('summary-email');
    const summaryPhone = document.getElementById('summary-phone');
    const summarySubject = document.getElementById('summary-subject');

    const infoModal = document.getElementById('info-modal');
    const infoModalCard = document.getElementById('info-modal-card');
    const infoModalBody = document.getElementById('info-modal-body');
    const infoModalCloseX = document.getElementById('info-modal-close-x');

    const backToTopBtn = document.getElementById('back-to-top');

    const REGEX_NAME = /^[a-zA-Zа-яА-ЯіІїЇєЄґҐ\s'-]{2,}$/;
    const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const REGEX_PHONE = /^\+380\d{9}$/;

    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 400) {
                backToTopBtn.classList.remove('opacity-0', 'pointer-events-none');
                backToTopBtn.classList.add('opacity-100', 'pointer-events-auto');
            } else {
                backToTopBtn.classList.add('opacity-0', 'pointer-events-none');
                backToTopBtn.classList.remove('opacity-100', 'pointer-events-auto');
            }
        });

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    if (phoneInput) {
        if (!phoneInput.value || phoneInput.value.trim() === '') phoneInput.value = '+380';

        phoneInput.addEventListener('focus', () => {
            if (!phoneInput.value) phoneInput.value = '+380';
        });

        phoneInput.addEventListener('input', () => {
            let val = phoneInput.value;
            if (!val.startsWith('+380')) {
                let digits = val.replace(/\D/g, '');
                if (digits.startsWith('380')) digits = digits.slice(3);
                else if (digits.startsWith('38')) digits = digits.slice(2);
                else if (digits.startsWith('3')) digits = digits.slice(1);
                else if (digits.startsWith('0')) digits = digits.slice(1);
                val = '+380' + digits;
            }
            phoneInput.value = '+380' + val.slice(4).replace(/\D/g, '').slice(0, 9);
            validatePhone();
        });
    }

    function showError(inputElement, errorElementId) {
        inputElement.classList.remove('border-gray-200', 'dark:border-[#333333]', 'border-emerald-500', 'focus:border-emerald-500');
        inputElement.classList.add('border-red-500', 'focus:border-red-500');
        inputElement.setAttribute('aria-invalid', 'true');
        const errorEl = document.getElementById(errorElementId);
        if (errorEl) errorEl.classList.remove('hidden');
    }

    function showSuccess(inputElement, errorElementId) {
        inputElement.classList.remove('border-gray-200', 'dark:border-[#333333]', 'border-red-500', 'focus:border-red-500');
        inputElement.classList.add('border-emerald-500', 'focus:border-emerald-500');
        inputElement.setAttribute('aria-invalid', 'false');
        const errorEl = document.getElementById(errorElementId);
        if (errorEl) errorEl.classList.add('hidden');
    }

    function validateName() {
        if (!nameInput) return true;
        const val = nameInput.value.trim();
        if (val.length >= 2 && REGEX_NAME.test(val)) {
            showSuccess(nameInput, 'name-error');
            return true;
        }
        showError(nameInput, 'name-error');
        return false;
    }

    function validateEmail() {
        if (!emailInput) return true;
        const val = emailInput.value.trim();
        if (REGEX_EMAIL.test(val)) {
            showSuccess(emailInput, 'email-error');
            return true;
        }
        showError(emailInput, 'email-error');
        return false;
    }

    function validatePhone() {
        if (!phoneInput) return true;
        const val = phoneInput.value.trim();
        if (REGEX_PHONE.test(val)) {
            showSuccess(phoneInput, 'phone-error');
            return true;
        }
        showError(phoneInput, 'phone-error');
        return false;
    }

    function validateMessage() {
        if (!messageInput) return true;
        const val = messageInput.value.trim();
        if (val.length >= 10) {
            showSuccess(messageInput, 'message-error');
            return true;
        }
        showError(messageInput, 'message-error');
        return false;
    }

    function validateAgreement() {
        if (!agreementCheckbox) return true;
        const errorEl = document.getElementById('agreement-error');
        if (agreementCheckbox.checked) {
            if (errorEl) errorEl.classList.add('hidden');
            return true;
        }
        if (errorEl) errorEl.classList.remove('hidden');
        return false;
    }

    if (nameInput) nameInput.addEventListener('input', validateName);
    if (emailInput) emailInput.addEventListener('input', validateEmail);
    if (messageInput) {
        messageInput.addEventListener('input', () => {
            if (charCounter) charCounter.textContent = `${messageInput.value.length} / 500 символів`;
            validateMessage();
        });
    }
    if (agreementCheckbox) agreementCheckbox.addEventListener('change', validateAgreement);

    if (form) {
        const submitFormBtn = form.querySelector('button[type="submit"]');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const isNameValid = validateName();
            const isEmailValid = validateEmail();
            const isPhoneValid = validatePhone();
            const isMessageValid = validateMessage();
            const isAgreementValid = validateAgreement();

            if (!isNameValid || !isEmailValid || !isPhoneValid || !isMessageValid || !isAgreementValid) {
                return;
            }

            const payload = {
                name: nameInput.value.trim(),
                email: emailInput.value.trim(),
                phone: phoneInput.value.trim(),
                subject: subjectSelect ? subjectSelect.value : 'Заявка з сайту',
                message: messageInput.value.trim(),
                _subject: `Нова заявка: ${subjectSelect ? subjectSelect.value : 'Новий простір'}`,
                _template: 'table'
            };

            const originalBtnHtml = submitFormBtn ? submitFormBtn.innerHTML : '';
            if (submitFormBtn) {
                submitFormBtn.disabled = true;
                submitFormBtn.classList.add('opacity-75', 'pointer-events-none');
                submitFormBtn.innerHTML = '<i class="fas fa-spinner fa-spin text-xs" aria-hidden="true"></i> <span>Надсилаємо...</span>';
            }

            try {
                const response = await fetch(`https://formsubmit.co/ajax/${TARGET_EMAIL}`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });

                if (!response.ok) {
                    throw new Error('Помилка відправки на поштовий сервіс');
                }
            } catch {
                const mailBody = encodeURIComponent(
                    `ПІБ: ${payload.name}\nEmail: ${payload.email}\nТелефон: ${payload.phone}\nТема: ${payload.subject}\n\nПовідомлення:\n${payload.message}`
                );
                window.location.href = `mailto:${TARGET_EMAIL}?subject=${encodeURIComponent(payload._subject)}&body=${mailBody}`;
            } finally {
                if (submitFormBtn) {
                    submitFormBtn.disabled = false;
                    submitFormBtn.classList.remove('opacity-75', 'pointer-events-none');
                    submitFormBtn.innerHTML = originalBtnHtml;
                }
            }

            if (summaryName) summaryName.textContent = payload.name;
            if (summaryEmail) summaryEmail.textContent = payload.email;
            if (summaryPhone) summaryPhone.textContent = payload.phone;
            if (summarySubject) summarySubject.textContent = payload.subject;

            openModal();
            form.reset();
            if (phoneInput) phoneInput.value = '+380';
            if (charCounter) charCounter.textContent = '0 / 500 символів';

            [nameInput, emailInput, phoneInput, messageInput].forEach(el => {
                if (el) {
                    el.classList.remove('border-emerald-500', 'border-red-500', 'focus:border-emerald-500', 'focus:border-red-500');
                }
            });
        });
    }

    function openModal() {
        if (!modal || !modalCard) return;
        modal.classList.remove('hidden');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modal.classList.remove('opacity-0');
                modalCard.classList.remove('scale-90', 'translate-y-4', 'opacity-0');
                modalCard.classList.add('scale-100', 'translate-y-0', 'opacity-100');
            });
        });
    }

    function closeModal() {
        if (!modal || !modalCard) return;
        modal.classList.add('opacity-0');
        modalCard.classList.remove('scale-100', 'translate-y-0', 'opacity-100');
        modalCard.classList.add('scale-90', 'translate-y-4', 'opacity-0');
        setTimeout(() => modal.classList.add('hidden'), 300);
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });

    // Модальні вікна послуг і команди
    const modalData = {
        "service-arch": {
            badge: "Тариф • Архітектура",
            title: "Архітектурне проєктування",
            subtitle: "від 35 $/м² • Термін: від 30 робочих днів",
            content: `
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-4 font-medium">Склад повного робочого проєкту включає:</p>
                <ul class="space-y-2.5 text-xs text-gray-700 dark:text-gray-300 mb-6">
                    <li class="flex items-center gap-2.5"><i class="fas fa-check-circle text-accent text-sm"></i> Генеральний план об'єкта та схематична прив'язка</li>
                    <li class="flex items-center gap-2.5"><i class="fas fa-check-circle text-accent text-sm"></i> 3D-візуалізації фасадів у високій роздільності</li>
                    <li class="flex items-center gap-2.5"><i class="fas fa-check-circle text-accent text-sm"></i> Поверхові плани, поетажна кладка та розрізи</li>
                    <li class="flex items-center gap-2.5"><i class="fas fa-check-circle text-accent text-sm"></i> Специфікація віконних та дверних блоків</li>
                    <li class="flex items-center gap-2.5"><i class="fas fa-check-circle text-accent text-sm"></i> Відповідність будівельним нормам України (ДБН)</li>
                </ul>
                <button id="info-modal-action-btn" type="button" class="w-full bg-[#B8502B] hover:bg-[#9A3E20] text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md">
                    Замовити концепт
                </button>
            `,
            subject: "Архітектурне проєктування"
        },
        "service-design": {
            badge: "Тариф • Інтер'єр",
            title: "Дизайн інтер'єру під ключ",
            subtitle: "від 25 $/м² • Термін: від 20 робочих днів",
            content: `
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-4 font-medium">Комплексний склад дизайн-проєкту:</p>
                <ul class="space-y-2.5 text-xs text-gray-700 dark:text-gray-300 mb-6">
                    <li class="flex items-center gap-2.5"><i class="fas fa-check-circle text-accent text-sm"></i> 3-4 варіативні об'ємно-планувальні рішення</li>
                    <li class="flex items-center gap-2.5"><i class="fas fa-check-circle text-accent text-sm"></i> Фотореалістичні 3D-рендери всіх приміщень</li>
                    <li class="flex items-center gap-2.5"><i class="fas fa-check-circle text-accent text-sm"></i> План прив'язки електрики, розеток та освітлення</li>
                    <li class="flex items-center gap-2.5"><i class="fas fa-check-circle text-accent text-sm"></i> Розгортки стін санвузлів та підбір сантехніки</li>
                    <li class="flex items-center gap-2.5"><i class="fas fa-check-circle text-accent text-sm"></i> Специфікація оздоблювальних матеріалів і меблів</li>
                </ul>
                <button id="info-modal-action-btn" type="button" class="w-full bg-[#B8502B] hover:bg-[#9A3E20] text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md">
                    Обрати цей тариф
                </button>
            `,
            subject: "Дизайн інтер'єру"
        },
        "service-supervision": {
            badge: "Супровід",
            title: "Авторський нагляд будівництва",
            subtitle: "від 15 $/м² • Виїзди щотижня",
            content: `
                <p class="text-xs text-gray-500 dark:text-gray-400 mb-4 font-medium">Гарантія точної реалізації вашого проєкту:</p>
                <ul class="space-y-2.5 text-xs text-gray-700 dark:text-gray-300 mb-6">
                    <li class="flex items-center gap-2.5"><i class="fas fa-check-circle text-accent text-sm"></i> Регулярні виїзди ГАПа/дизайнера на об'єкт</li>
                    <li class="flex items-center gap-2.5"><i class="fas fa-check-circle text-accent text-sm"></i> Контроль відповідності робіт робочим кресленням</li>
                    <li class="flex items-center gap-2.5"><i class="fas fa-check-circle text-accent text-sm"></i> Консультації виконроба та підрядних бригад</li>
                    <li class="flex items-center gap-2.5"><i class="fas fa-check-circle text-accent text-sm"></i> Оперативне внесення коригувань у креслення</li>
                </ul>
                <button id="info-modal-action-btn" type="button" class="w-full bg-[#B8502B] hover:bg-[#9A3E20] text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md">
                    Замовити нагляд
                </button>
            `,
            subject: "Авторський нагляд"
        },
        "team-koval": {
            badge: "Головний архітектор",
            title: "Задати питання Олександру Ковалю",
            subtitle: "ГАП • Досвід понад 10 років у житловій та комерційній архітектурі",
            content: `
                <div class="mb-5 text-left">
                    <label for="modal-koval-q" class="block text-xs font-bold text-main-text dark:text-white mb-2">Написати повідомлення старшому архітектору: <span class="text-accent">*</span></label>
                    <textarea id="modal-koval-q" rows="3" placeholder="Введіть ваше запитання для Олександра Коваля..." class="w-full p-3 border border-gray-300 dark:border-gray-700 rounded-xl text-xs bg-white dark:bg-[#161616] text-main-text dark:text-white focus:outline-none focus:border-accent resize-none transition-colors"></textarea>
                    <p id="koval-q-error" class="hidden text-xs text-red-500 mt-1.5 flex items-center gap-1.5">
                        <i class="fas fa-exclamation-circle"></i> <span>Введіть запитання (мінімум 5 символів)</span>
                    </p>
                </div>
                <button id="btn-submit-koval-q" type="button" class="w-full bg-[#B8502B] hover:bg-[#9A3E20] text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md flex items-center justify-center gap-2">
                    <i class="fas fa-paper-plane"></i> Перейти до оформлення заявки
                </button>
            `
        },
        "team-danylenko": {
            badge: "Портфоліо дизайнерки",
            title: "Олена Даниленко — Галерея інтер'єрів",
            subtitle: "Стилі: Мінімалізм, Джапанді, Сучасний модерн",
            content: `
                <p class="text-xs text-gray-600 dark:text-gray-400 mb-3">Натисніть на будь-яке фото для перегляду галереї у HD-якості:</p>
                <div class="grid grid-cols-3 gap-3">
                    <a href="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1200&q=80" data-fancybox="danylenko-gallery" data-caption="Сучасна світла вітальня (Олена Даниленко)" class="h-32 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group block relative cursor-pointer">
                        <img src="https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=400&q=80" alt="Інтер'єр 1" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                    </a>
                    <a href="https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=1200&q=80" data-fancybox="danylenko-gallery" data-caption="Ергономічна кухня Джапанді (Олена Даниленко)" class="h-32 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group block relative cursor-pointer">
                        <img src="https://images.unsplash.com/photo-1600121848594-d8644e57abab?auto=format&fit=crop&w=400&q=80" alt="Інтер'єр 2" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                    </a>
                    <a href="https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=80" data-fancybox="danylenko-gallery" data-caption="Мінімалістична спальня (Олена Даниленко)" class="h-32 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 group block relative cursor-pointer">
                        <img src="https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=400&q=80" alt="Інтер'єр 3" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300">
                    </a>
                </div>
            `
        },
        "team-melnyk": {
            badge: "Профіль архітектора-конструктора",
            title: "Ігор Мельник",
            subtitle: "Сертифікований інженер-конструктор та реставратор (НСАУ)",
            content: `
                <div class="space-y-3 mb-6 text-xs text-gray-700 dark:text-gray-300 text-left">
                    <div class="flex items-start gap-3 bg-gray-50 dark:bg-black/40 p-3 rounded-xl border border-gray-200 dark:border-gray-800">
                        <i class="fas fa-award text-accent text-base mt-0.5"></i>
                        <div>
                            <strong class="block text-main-text dark:text-white font-bold">Офіційна атестація НСАУ</strong>
                            <span>Державний сертифікат на розрахунок складних несучих конструкцій та реставрацію.</span>
                        </div>
                    </div>
                    <div class="flex items-start gap-3 bg-gray-50 dark:bg-black/40 p-3 rounded-xl border border-gray-200 dark:border-gray-800">
                        <i class="fas fa-monument text-accent text-base mt-0.5"></i>
                        <div>
                            <strong class="block text-main-text dark:text-white font-bold">Реставрація пам'яток архітектури</strong>
                            <span>Досвід понад 8 років з відновлення історичних фасадів у центральній частині Львова.</span>
                        </div>
                    </div>
                    <div class="flex items-start gap-3 bg-gray-50 dark:bg-black/40 p-3 rounded-xl border border-gray-200 dark:border-gray-800">
                        <i class="fas fa-building text-accent text-base mt-0.5"></i>
                        <div>
                            <strong class="block text-main-text dark:text-white font-bold">Моноліт та метал</strong>
                            <span>Розрахунок залізобетонних каркасів, фундаментів та посилення несучих елементів.</span>
                        </div>
                    </div>
                </div>
                <button id="info-modal-action-btn" type="button" class="w-full bg-[#B8502B] hover:bg-[#9A3E20] text-white font-bold py-3.5 rounded-xl text-xs uppercase tracking-wider transition-all duration-200 cursor-pointer shadow-md">
                    Проконсультуватися з Ігорем
                </button>
            `,
            subject: "Архітектурне проєктування"
        }
    };

    function openInfoModal(key) {
        const item = modalData[key];
        if (!item || !infoModal || !infoModalBody) return;

        infoModalBody.innerHTML = `
            <span class="inline-block text-[10px] font-bold text-accent bg-accent/10 px-2.5 py-1 rounded uppercase mb-3 tracking-wider">${item.badge}</span>
            <h3 class="font-heading text-xl font-bold text-main-text dark:text-white mb-1">${item.title}</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">${item.subtitle}</p>
            ${item.content}
        `;

        infoModal.classList.remove('hidden');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                infoModal.classList.remove('opacity-0');
                infoModalCard.classList.remove('scale-90', 'translate-y-4', 'opacity-0');
                infoModalCard.classList.add('scale-100', 'translate-y-0', 'opacity-100');
            });
        });

        const actionBtn = document.getElementById('info-modal-action-btn');
        if (actionBtn) {
            actionBtn.addEventListener('click', () => {
                closeInfoModal();
                if (subjectSelect && item.subject) subjectSelect.value = item.subject;
                const consultationSection = document.getElementById('consultation');
                if (consultationSection) consultationSection.scrollIntoView({ behavior: 'smooth' });
            });
        }

        const submitKovalBtn = document.getElementById('btn-submit-koval-q');
        const kovalTextarea = document.getElementById('modal-koval-q');
        const kovalErr = document.getElementById('koval-q-error');

        if (submitKovalBtn && kovalTextarea) {
            kovalTextarea.addEventListener('input', () => {
                if (kovalTextarea.value.trim().length >= 5) {
                    if (kovalErr) kovalErr.classList.add('hidden');
                    kovalTextarea.classList.remove('border-red-500');
                }
            });

            submitKovalBtn.addEventListener('click', () => {
                const qText = kovalTextarea.value.trim();
                if (!qText || qText.length < 5) {
                    if (kovalErr) kovalErr.classList.remove('hidden');
                    kovalTextarea.classList.add('border-red-500');
                    kovalTextarea.focus();
                    return;
                }

                closeInfoModal();

                if (messageInput) {
                    messageInput.value = `Запитання до головного архітектора (Олександра Коваля):\n${qText}`;
                    messageInput.dispatchEvent(new Event('input', { bubbles: true }));
                }
                if (subjectSelect) {
                    subjectSelect.value = 'Безкоштовна консультація';
                }

                const consultationSection = document.getElementById('consultation');
                if (consultationSection) {
                    consultationSection.scrollIntoView({ behavior: 'smooth' });
                }
                if (nameInput) {
                    setTimeout(() => nameInput.focus(), 500);
                }
            });
        }
    }

    function closeInfoModal() {
        if (!infoModal || !infoModalCard) return;
        infoModal.classList.add('opacity-0');
        infoModalCard.classList.remove('scale-100', 'translate-y-0', 'opacity-100');
        infoModalCard.classList.add('scale-90', 'translate-y-4', 'opacity-0');
        setTimeout(() => infoModal.classList.add('hidden'), 300);
    }

    document.querySelectorAll('[data-modal-trigger]').forEach(btn => {
        btn.addEventListener('click', () => openInfoModal(btn.getAttribute('data-modal-trigger')));
    });

    if (infoModalCloseX) infoModalCloseX.addEventListener('click', closeInfoModal);
    if (infoModal) infoModal.addEventListener('click', e => { if (e.target === infoModal) closeInfoModal(); });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
            if (document.querySelector('.fancybox__container')) return;
            if (infoModal && !infoModal.classList.contains('hidden')) { closeInfoModal(); return; }
            if (modal && !modal.classList.contains('hidden')) { closeModal(); return; }
            if (menuToggle) menuToggle.checked = false;
        }
    });

    // Слайдер До / Після з перемикачем об'єктів
    const range = document.getElementById('comparison-range');
    const beforeWrapper = document.getElementById('before-wrapper');
    const beforeImg = document.getElementById('before-img');
    const afterImg = document.getElementById('after-img');
    const handle = document.getElementById('slider-handle');
    const sliderContainer = document.getElementById('before-after-slider');
    const badgeBefore = document.getElementById('badge-before');
    const badgeAfter = document.getElementById('badge-after');
    const switchOverlay = document.getElementById('ba-switch-overlay');
    const baTabBtns = document.querySelectorAll('[data-ba-tab]');
    const baMainCaption = document.getElementById('ba-main-caption');

    const baProjects = [
        {
            before: 'assets/images/before.jpg',
            after: 'assets/images/after.jpg',
            beforeBadge: 'ДО РЕМОНТУ',
            afterBadge: 'ПІСЛЯ РЕВІТАЛІЗАЦІЇ',
            caption: 'Ревіталізація промислового простору • 140 м² • Мінімалізм'
        },
        {
            before: 'assets/images/before-2.jpg',
            after: 'assets/images/after-2.jpg',
            beforeBadge: 'ДО РЕМОНТУ',
            afterBadge: 'ПІСЛЯ РЕВІТАЛІЗАЦІЇ',
            caption: 'Апартаменти в історичному будинку Львова • 95 м² • Джапанді'
        }
    ];

    let activeBaIndex = 0;

    if (range && beforeWrapper && handle && sliderContainer && beforeImg) {
        function updateSlider() {
            const val = Number(range.value);
            beforeWrapper.style.width = `${val}%`;
            handle.style.left = `${val}%`;
            beforeImg.style.width = `${sliderContainer.offsetWidth}px`;
            if (badgeBefore) badgeBefore.style.opacity = val < 5 ? '0' : '1';
            if (badgeAfter) badgeAfter.style.opacity = val > 95 ? '0' : '1';
        }

        range.addEventListener('input', updateSlider);
        window.addEventListener('resize', updateSlider);
        updateSlider();

        baTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const idx = Number(btn.getAttribute('data-ba-tab'));
                if (idx === activeBaIndex) return;
                const project = baProjects[idx];
                if (!project) return;
                activeBaIndex = idx;

                baTabBtns.forEach(b => {
                    const isActive = b === btn;
                    b.setAttribute('aria-selected', String(isActive));
                    if (isActive) {
                        b.classList.add('bg-[#B8502B]', 'text-white', 'shadow-sm');
                        b.classList.remove('text-gray-700', 'dark:text-gray-300');
                    } else {
                        b.classList.remove('bg-[#B8502B]', 'text-white', 'shadow-sm');
                        b.classList.add('text-gray-700', 'dark:text-gray-300');
                    }
                });

                if (switchOverlay) {
                    switchOverlay.classList.remove('opacity-0');
                    switchOverlay.classList.add('opacity-100');
                }

                const preloadImg = (src, fallback) => new Promise(resolve => {
                    const img = new Image();
                    img.onload = () => resolve(src);
                    img.onerror = () => resolve(fallback);
                    img.src = src;
                });

                Promise.all([
                    preloadImg(project.before, 'assets/images/before.jpg'),
                    preloadImg(project.after, 'assets/images/after.jpg'),
                    new Promise(r => setTimeout(r, 180))
                ]).then(([resolvedBefore, resolvedAfter]) => {
                    beforeImg.src = resolvedBefore;
                    if (afterImg) afterImg.src = resolvedAfter;

                    if (badgeBefore) badgeBefore.textContent = project.beforeBadge;
                    if (badgeAfter) badgeAfter.textContent = project.afterBadge;
                    if (baMainCaption) baMainCaption.textContent = project.caption;

                    range.value = '50';
                    updateSlider();

                    if (switchOverlay) {
                        switchOverlay.classList.remove('opacity-100');
                        switchOverlay.classList.add('opacity-0');
                    }
                });
            });
        });
    }

    if (typeof Fancybox !== 'undefined') {
        Fancybox.bind('[data-fancybox]', {
            Hash: false,
            Thumbs: { autoStart: true }
        });
    }
});