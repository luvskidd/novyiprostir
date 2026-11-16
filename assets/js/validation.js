document.addEventListener('DOMContentLoaded', () => {
    const htmlElement = document.documentElement;
    const themeToggleBtns = document.querySelectorAll('.theme-toggle-btn');

    function updateThemeButtons(isDark) {
        themeToggleBtns.forEach(btn => {
            const icon = btn.querySelector('i');
            const label = btn.querySelector('span');
            const isMobileFull = btn.classList.contains('w-full');

            if (isDark) {
                if (icon) {
                    icon.classList.remove('fa-moon');
                    icon.classList.add('fa-sun');
                }
                if (label) {
                    label.textContent = isMobileFull ? 'Світла тема' : 'Тема';
                }
            } else {
                if (icon) {
                    icon.classList.remove('fa-sun');
                    icon.classList.add('fa-moon');
                }
                if (label) {
                    label.textContent = isMobileFull ? 'Темна тема' : 'Тема';
                }
            }
        });
    }

    updateThemeButtons(htmlElement.classList.contains('dark'));

    themeToggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const isDark = htmlElement.classList.toggle('dark');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            updateThemeButtons(isDark);
        });
    });

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

    // Ініціалізація Fancybox
    if (typeof Fancybox !== 'undefined') {
        Fancybox.bind('[data-fancybox="projects-gallery"]', {
            Toolbar: {
                display: {
                    left: ['infobar'],
                    middle: [],
                    right: ['zoomIn', 'zoomOut', 'fullscreen', 'thumbs', 'close']
                }
            }
        });
    }

    // Кнопка "Нагору"
    const backToTopBtn = document.getElementById('back-to-top');
    if (backToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 500) {
                backToTopBtn.classList.remove('opacity-0', 'pointer-events-none');
                backToTopBtn.classList.add('opacity-100', 'pointer-events-auto');
            } else {
                backToTopBtn.classList.add('opacity-0', 'pointer-events-none');
                backToTopBtn.classList.remove('opacity-100', 'pointer-events-auto');
            }
        }, { passive: true });

        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }

    // Слайдер До / Після
    const slider = document.getElementById('before-after-slider');
    const comparisonRange = document.getElementById('comparison-range');
    const beforeWrapper = document.getElementById('before-wrapper');
    const beforeImg = document.getElementById('before-img');
    const sliderHandle = document.getElementById('slider-handle');
    const badgeBefore = document.getElementById('badge-before');
    const badgeAfter = document.getElementById('badge-after');

    function updateSliderDimensions() {
        if (!slider || !beforeImg) return;
        beforeImg.style.width = `${slider.offsetWidth}px`;
    }

    function updateComparison(value) {
        if (!beforeWrapper || !sliderHandle) return;
        const pct = Math.max(0, Math.min(100, Number(value)));
        beforeWrapper.style.width = `${pct}%`;
        sliderHandle.style.left = `${pct}%`;

        if (badgeBefore) {
            badgeBefore.style.opacity = pct < 15 ? '0' : '1';
        }
        if (badgeAfter) {
            badgeAfter.style.opacity = pct > 85 ? '0' : '1';
        }
    }

    if (slider && comparisonRange) {
        updateSliderDimensions();
        updateComparison(comparisonRange.value);

        window.addEventListener('resize', updateSliderDimensions, { passive: true });
        comparisonRange.addEventListener('input', (e) => {
            updateComparison(e.target.value);
        });
    }

    // Курс валют НБУ
    let nbuRate = 41.50;
    const nbuRateVal = document.getElementById('nbu-rate-val');
    const nbuDateVal = document.getElementById('nbu-date-val');

    async function fetchNbuRate() {
        try {
            const response = await fetch('https://bank.gov.ua/NBUStatService/v1/statdirectory/exchange?valcode=USD&json');
            if (!response.ok) throw new Error('NBU API error');
            const data = await response.json();
            if (Array.isArray(data) && data[0] && data[0].rate) {
                nbuRate = Number(data[0].rate);
                if (nbuRateVal) nbuRateVal.textContent = `${nbuRate.toFixed(2)} ₴`;
                if (nbuDateVal) nbuDateVal.textContent = `Офіційний курс НБУ (${data[0].exchangedate || 'актуальний'})`;
                if (isCalculated) calculateProjectCost();
            }
        } catch (err) {
            if (nbuRateVal) nbuRateVal.textContent = `${nbuRate.toFixed(2)} ₴`;
            if (nbuDateVal) nbuDateVal.textContent = 'Резервний курс НБУ';
        }
    }

    fetchNbuRate();

    // Калькулятор вартості проєкту
    const calcAreaInput = document.getElementById('calc-area');
    const calcAreaRange = document.getElementById('calc-area-range');
    const calcAreaError = document.getElementById('calc-area-error');
    const calcTypeRadios = document.querySelectorAll('input[name="calc-type-radio"]');
    const calcTariffSelect = document.getElementById('calc-tariff');
    const calcOptSupervision = document.getElementById('calc-opt-supervision');
    const calcOptSmartHome = document.getElementById('calc-opt-smarthome');
    const calcOptUrgent = document.getElementById('calc-opt-urgent');

    const calcSubmitWrapper = document.getElementById('calc-submit-wrapper');
    const calcSubmitBtn = document.getElementById('calc-submit-btn');
    const calcResultBox = document.getElementById('calc-result-box');
    const calcTotalUsd = document.getElementById('calc-total-usd');
    const calcTotalUah = document.getElementById('calc-total-uah');
    const calcBreakdownText = document.getElementById('calc-breakdown-text');
    const calcTransferBtn = document.getElementById('calc-transfer-btn');
    const calcExportBtn = document.getElementById('calc-export-btn');

    let isCalculated = false;
    let lastCalculationSummary = '';

    function validateArea() {
        if (!calcAreaInput) return false;
        const val = Number(calcAreaInput.value);
        const isValid = Number.isInteger(val) && val >= 15 && val <= 500;
        if (!isValid) {
            if (calcAreaError) calcAreaError.classList.remove('hidden');
            calcAreaInput.setAttribute('aria-invalid', 'true');
            calcAreaInput.classList.add('border-red-500');
        } else {
            if (calcAreaError) calcAreaError.classList.add('hidden');
            calcAreaInput.setAttribute('aria-invalid', 'false');
            calcAreaInput.classList.remove('border-red-500');
        }
        return isValid;
    }

    function calculateProjectCost() {
        if (!validateArea()) return null;

        const area = Number(calcAreaInput.value);
        const selectedTypeRadio = document.querySelector('input[name="calc-type-radio"]:checked');
        const typeCoeff = selectedTypeRadio ? Number(selectedTypeRadio.dataset.coeff) : 1.0;
        const typeLabelMap = { flat: 'Квартира', house: 'Будинок', commercial: 'Комерція' };
        const typeLabel = selectedTypeRadio ? (typeLabelMap[selectedTypeRadio.value] || 'Квартира') : 'Квартира';

        const selectedOption = calcTariffSelect.options[calcTariffSelect.selectedIndex];
        const basePricePerSqm = selectedOption ? Number(selectedOption.dataset.price) : 35;
        const tariffName = selectedOption ? selectedOption.text.split('—')[0].trim() : 'Standard';

        let subtotal = area * basePricePerSqm * typeCoeff;
        const details = [
            `• Площа: ${area} м² × $${basePricePerSqm}/м² (${tariffName})`,
            `• Тип об'єкта: ${typeLabel} (коефіцієнт ×${typeCoeff.toFixed(1)})`
        ];

        if (calcOptSupervision && calcOptSupervision.checked) {
            const supCost = subtotal * 0.2;
            subtotal += supCost;
            details.push(`• Авторський нагляд (+20%): +$${Math.round(supCost).toLocaleString('en-US')}`);
        }

        if (calcOptUrgent && calcOptUrgent.checked) {
            const urgCost = subtotal * 0.15;
            subtotal += urgCost;
            details.push(`• Термінова розробка (+15%): +$${Math.round(urgCost).toLocaleString('en-US')}`);
        }

        if (calcOptSmartHome && calcOptSmartHome.checked) {
            subtotal += 500;
            details.push('• Проєктування Smart Home: +$500');
        }

        const totalUsd = Math.round(subtotal);
        const totalUah = Math.round(totalUsd * nbuRate);

        if (calcTotalUsd) calcTotalUsd.textContent = `$${totalUsd.toLocaleString('en-US')}`;
        if (calcTotalUah) calcTotalUah.textContent = `(~ ${totalUah.toLocaleString('uk-UA')} ₴)`;
        if (calcBreakdownText) {
            calcBreakdownText.innerHTML = details.map(line => `<p>${line}</p>`).join('');
        }

        lastCalculationSummary =
            `КОШТОРИС ПРОЄКТУ — АРХІТЕКТУРНЕ БЮРО «НОВИЙ ПРОСТІР»\n` +
            `====================================================\n` +
            `${details.join('\n')}\n` +
            `----------------------------------------------------\n` +
            `Курс НБУ: 1 USD = ${nbuRate.toFixed(2)} UAH\n` +
            `Орієнтовна вартість: $${totalUsd.toLocaleString('en-US')} (~ ${totalUah.toLocaleString('uk-UA')} ₴)\n` +
            `====================================================`;

        return { totalUsd, totalUah, area, tariffName, typeLabel };
    }

    function showCalculationResult() {
        const res = calculateProjectCost();
        if (!res) return;

        isCalculated = true;
        if (calcSubmitWrapper) {
            calcSubmitWrapper.classList.remove('grid-rows-[1fr]', 'opacity-100', 'scale-100');
            calcSubmitWrapper.classList.add('grid-rows-[0fr]', 'opacity-0', 'scale-95', 'pointer-events-none');
        }
        if (calcResultBox) {
            calcResultBox.classList.remove('grid-rows-[0fr]', 'opacity-0', 'translate-y-2', 'pointer-events-none');
            calcResultBox.classList.add('grid-rows-[1fr]', 'opacity-100', 'translate-y-0', 'pointer-events-auto');
        }
    }

    if (calcAreaInput && calcAreaRange) {
        calcAreaRange.addEventListener('input', () => {
            calcAreaInput.value = calcAreaRange.value;
            validateArea();
            if (isCalculated) calculateProjectCost();
        });

        calcAreaInput.addEventListener('input', () => {
            const val = Number(calcAreaInput.value);
            if (val >= 15 && val <= 500) {
                calcAreaRange.value = val;
            }
            validateArea();
            if (isCalculated) calculateProjectCost();
        });
    }

    calcTypeRadios.forEach(radio => {
        radio.addEventListener('change', () => {
            if (isCalculated) calculateProjectCost();
        });
    });

    if (calcTariffSelect) {
        calcTariffSelect.addEventListener('change', () => {
            if (isCalculated) calculateProjectCost();
        });
    }

    [calcOptSupervision, calcOptSmartHome, calcOptUrgent].forEach(chk => {
        if (chk) {
            chk.addEventListener('change', () => {
                if (isCalculated) calculateProjectCost();
            });
        }
    });

    if (calcSubmitBtn) {
        calcSubmitBtn.addEventListener('click', showCalculationResult);
    }

    if (calcTransferBtn) {
        calcTransferBtn.addEventListener('click', () => {
            const res = calculateProjectCost();
            if (!res) return;

            const messageField = document.getElementById('message');
            const subjectSelect = document.getElementById('subject');
            const consultationSection = document.getElementById('consultation');

            if (subjectSelect) {
                subjectSelect.value = 'Архітектурне проєктування';
            }
            if (messageField) {
                messageField.value = `Запит на детальний кошторис: ${res.typeLabel}, площа ${res.area} м², пакет ${res.tariffName}. Орієнтовний бюджет: $${res.totalUsd.toLocaleString('en-US')}.`;
                messageField.dispatchEvent(new Event('input'));
            }
            if (consultationSection) {
                consultationSection.scrollIntoView({ behavior: 'smooth' });
            }
        });
    }

    if (calcExportBtn) {
        calcExportBtn.addEventListener('click', () => {
            if (!lastCalculationSummary) calculateProjectCost();
            if (!lastCalculationSummary) return;

            const blob = new Blob([lastCalculationSummary], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = 'koshtorys-novyi-prostir.txt';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        });
    }

    // Інформаційні модальні вікна (послуги та команда)
    const infoModal = document.getElementById('info-modal');
    const infoModalCard = document.getElementById('info-modal-card');
    const infoModalBody = document.getElementById('info-modal-body');
    const infoModalCloseX = document.getElementById('info-modal-close-x');

    const modalTemplates = {
        'service-arch': `
            <span class="text-xs font-bold uppercase text-accent tracking-wider">Послуга бюро</span>
            <h3 class="font-heading text-2xl font-bold mt-1 mb-3">Архітектурне проєктування</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">Розробляємо повний пакет архітектурно-будівельних креслень відповідно до чинних ДБН України.</p>
            <ul class="space-y-2 text-xs sm:text-sm text-gray-700 dark:text-gray-200 mb-6">
                <li><strong>1. Ескізний проєкт (ЕП):</strong> посадка на ділянку, поверхові плани, фасади, 3D-візуалізація.</li>
                <li><strong>2. Робочий проєкт (РП):</strong> конструктивні рішення, вузли, фундаменти, покрівля, специфікації матеріалів.</li>
                <li><strong>3. Інженерні мережі:</strong> опалення, вентиляція, водопостачання та електропостачання.</li>
            </ul>
            <a href="#consultation" class="modal-cta-link block w-full bg-accent hover:bg-accent-hover text-white font-bold text-xs py-3.5 rounded-xl text-center uppercase tracking-wider">Замовити консультацію ГАП</a>
        `,
        'service-design': `
            <span class="text-xs font-bold uppercase text-accent tracking-wider">Тарифи дизайну</span>
            <h3 class="font-heading text-2xl font-bold mt-1 mb-3">Дизайн інтер'єру під ключ</h3>
            <div class="space-y-3 text-xs sm:text-sm mb-6">
                <div class="p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                    <strong class="text-accent">Basic ($25/м²):</strong> обмірний план, 3 варіанти планування, план демонтажу/монтажу та розстановки меблів.
                </div>
                <div class="p-3 rounded-xl border border-accent bg-accent/5">
                    <strong class="text-accent">Standard ($35/м²):</strong> фотореалістичні 3D-візуалізації всіх приміщень + повний альбом технічних креслень для будівельників.
                </div>
                <div class="p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                    <strong class="text-accent">Premium ($50/м²):</strong> повний 3D-проєкт, специфікація всіх меблів, світла, сантехніки та 1 місяць авторського нагляду.
                </div>
            </div>
            <a href="#calculator" class="modal-cta-link block w-full bg-accent hover:bg-accent-hover text-white font-bold text-xs py-3.5 rounded-xl text-center uppercase tracking-wider">Перейти до калькулятора</a>
        `,
        'service-supervision': `
            <span class="text-xs font-bold uppercase text-accent tracking-wider">Супровід будівництва</span>
            <h3 class="font-heading text-2xl font-bold mt-1 mb-3">Авторський нагляд</h3>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-4">Гарантуємо, що реалізований об'єкт на 100% відповідатиме затвердженим візуалізаціям та кресленням.</p>
            <ul class="space-y-2 text-xs sm:text-sm text-gray-700 dark:text-gray-200 mb-6">
                <li>• Щотижневі планові виїзди архітектора на об'єкт (4 рази на місяць).</li>
                <li>• Фотозвіт після кожного візиту в окремому чаті проєкту.</li>
                <li>• Оперативне коригування вузлів при виявленні прихованих особливостей конструкцій.</li>
                <li>• Перевірка зразків фарб, плитки та паркету безпосередньо на місці.</li>
            </ul>
            <a href="#consultation" class="modal-cta-link block w-full bg-accent hover:bg-accent-hover text-white font-bold text-xs py-3.5 rounded-xl text-center uppercase tracking-wider">Замовити супровід</a>
        `,
        'team-koval': `
            <span class="text-xs font-bold uppercase text-accent tracking-wider">Головний архітектор (ГАП)</span>
            <h3 class="font-heading text-2xl font-bold mt-1 mb-2">Олександр Коваль</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">Кваліфікаційний сертифікат архітектора • Досвід 12 років</p>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-6">Спеціалізується на енергоефективних приватних резиденціях, панорамному склінні та складних ділянках зі схилом у Львові та Карпатах.</p>
            <a href="#consultation" class="modal-cta-link block w-full bg-accent hover:bg-accent-hover text-white font-bold text-xs py-3.5 rounded-xl text-center uppercase tracking-wider">Записатися на зустріч з Олександром</a>
        `,
        'team-danylenko': `
            <span class="text-xs font-bold uppercase text-accent tracking-wider">Провідна дизайнерка</span>
            <h3 class="font-heading text-2xl font-bold mt-1 mb-2">Олена Даниленко</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">35+ реалізованих житлових та комерційних інтер'єрів</p>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-6">Працює з натуральним деревом, каменем, мікроцементом і багаторівневими сценаріями освітлення. Усі реалізовані проєкти доступні у галереї вище.</p>
            <a href="#before-after" class="modal-cta-link block w-full bg-accent hover:bg-accent-hover text-white font-bold text-xs py-3.5 rounded-xl text-center uppercase tracking-wider">Переглянути галерею робіт</a>
        `,
        'team-melnyk': `
            <span class="text-xs font-bold uppercase text-accent tracking-wider">Інженер-конструктор та реставратор</span>
            <h3 class="font-heading text-2xl font-bold mt-1 mb-2">Ігор Мельник</h3>
            <p class="text-xs text-gray-500 dark:text-gray-400 mb-4">Член Національної спілки архітекторів України (НСАУ)</p>
            <p class="text-sm text-gray-600 dark:text-gray-300 mb-6">Відповідає за конструктивну надійність будівель, підсилення фундаментів і делікатну реставрацію історичних будівель центру Львова.</p>
            <a href="#consultation" class="modal-cta-link block w-full bg-accent hover:bg-accent-hover text-white font-bold text-xs py-3.5 rounded-xl text-center uppercase tracking-wider">Отримати інженерну консультацію</a>
        `
    };

    function openInfoModal(key) {
        if (!infoModal || !infoModalBody || !modalTemplates[key]) return;
        infoModalBody.innerHTML = modalTemplates[key];

        infoModalBody.querySelectorAll('.modal-cta-link').forEach(link => {
            link.addEventListener('click', closeInfoModal);
        });

        infoModal.classList.remove('hidden');
        requestAnimationFrame(() => {
            infoModal.classList.remove('opacity-0');
            if (infoModalCard) {
                infoModalCard.classList.remove('scale-90', 'translate-y-4', 'opacity-0');
            }
        });
    }

    function closeInfoModal() {
        if (!infoModal) return;
        infoModal.classList.add('opacity-0');
        if (infoModalCard) {
            infoModalCard.classList.add('scale-90', 'translate-y-4', 'opacity-0');
        }
        setTimeout(() => {
            infoModal.classList.add('hidden');
        }, 250);
    }

    document.querySelectorAll('[data-modal-trigger]').forEach(btn => {
        btn.addEventListener('click', () => {
            openInfoModal(btn.dataset.modalTrigger);
        });
    });

    if (infoModalCloseX) infoModalCloseX.addEventListener('click', closeInfoModal);
    if (infoModal) {
        infoModal.addEventListener('click', (e) => {
            if (e.target === infoModal) closeInfoModal();
        });
    }

    // Валідація форми зворотного зв'язку
    const feedbackForm = document.getElementById('feedback-form');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const subjectInput = document.getElementById('subject');
    const messageInput = document.getElementById('message');
    const agreementInput = document.getElementById('agreement');
    const charCounter = document.getElementById('char-counter');

    const successModal = document.getElementById('success-modal');
    const modalCard = document.getElementById('modal-card');
    const closeModalBtn = document.getElementById('close-modal');

    function setFieldState(input, errorEl, isValid) {
        if (!input || !errorEl) return;
        if (isValid) {
            errorEl.classList.add('hidden');
            input.setAttribute('aria-invalid', 'false');
            input.classList.remove('border-red-500');
        } else {
            errorEl.classList.remove('hidden');
            input.setAttribute('aria-invalid', 'true');
            input.classList.add('border-red-500');
        }
    }

    function validateName() {
        const val = nameInput.value.trim();
        const isValid = val.length >= 2 && /^[a-zA-Zа-яА-ЯіІїЇєЄґҐ'’\-\s]+$/.test(val);
        setFieldState(nameInput, document.getElementById('name-error'), isValid);
        return isValid;
    }

    function validateEmail() {
        const val = emailInput.value.trim();
        const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val);
        setFieldState(emailInput, document.getElementById('email-error'), isValid);
        return isValid;
    }

    function validatePhone() {
        const val = phoneInput.value.trim();
        const isValid = /^\+380\d{9}$/.test(val);
        setFieldState(phoneInput, document.getElementById('phone-error'), isValid);
        return isValid;
    }

    function validateMessage() {
        const val = messageInput.value.trim();
        const isValid = val.length >= 10;
        setFieldState(messageInput, document.getElementById('message-error'), isValid);
        return isValid;
    }

    function validateAgreement() {
        const errorEl = document.getElementById('agreement-error');
        const isValid = agreementInput.checked;
        if (errorEl) {
            errorEl.classList.toggle('hidden', isValid);
        }
        return isValid;
    }

    if (phoneInput) {
        phoneInput.addEventListener('input', () => {
            let digits = phoneInput.value.replace(/\D/g, '');
            if (!digits.startsWith('380')) {
                digits = '380' + digits.replace(/^380?/, '');
            }
            phoneInput.value = '+' + digits.slice(0, 12);
            if (phoneInput.getAttribute('aria-invalid') === 'true') validatePhone();
        });
    }

    if (messageInput && charCounter) {
        messageInput.addEventListener('input', () => {
            charCounter.textContent = `${messageInput.value.length} / 500 символів`;
            if (messageInput.getAttribute('aria-invalid') === 'true') validateMessage();
        });
    }

    if (nameInput) nameInput.addEventListener('blur', validateName);
    if (emailInput) emailInput.addEventListener('blur', validateEmail);
    if (phoneInput) phoneInput.addEventListener('blur', validatePhone);
    if (messageInput) messageInput.addEventListener('blur', validateMessage);
    if (agreementInput) agreementInput.addEventListener('change', validateAgreement);

    function openSuccessModal() {
        if (!successModal) return;
        document.getElementById('summary-name').textContent = nameInput.value.trim();
        document.getElementById('summary-email').textContent = emailInput.value.trim();
        document.getElementById('summary-phone').textContent = phoneInput.value.trim();
        document.getElementById('summary-subject').textContent = subjectInput ? subjectInput.value : '';

        successModal.classList.remove('hidden');
        requestAnimationFrame(() => {
            successModal.classList.remove('opacity-0');
            if (modalCard) {
                modalCard.classList.remove('scale-90', 'translate-y-4', 'opacity-0');
            }
        });
    }

    function closeSuccessModal() {
        if (!successModal) return;
        successModal.classList.add('opacity-0');
        if (modalCard) {
            modalCard.classList.add('scale-90', 'translate-y-4', 'opacity-0');
        }
        setTimeout(() => {
            successModal.classList.add('hidden');
        }, 250);
    }

    if (closeModalBtn) closeModalBtn.addEventListener('click', closeSuccessModal);
    if (successModal) {
        successModal.addEventListener('click', (e) => {
            if (e.target === successModal) closeSuccessModal();
        });
    }

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            closeSuccessModal();
            closeInfoModal();
            if (menuToggle) menuToggle.checked = false;
        }
    });

    if (feedbackForm) {
        feedbackForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const isNameOk = validateName();
            const isEmailOk = validateEmail();
            const isPhoneOk = validatePhone();
            const isMessageOk = validateMessage();
            const isAgreementOk = validateAgreement();

            if (isNameOk && isEmailOk && isPhoneOk && isMessageOk && isAgreementOk) {
                openSuccessModal();
                feedbackForm.reset();
                if (phoneInput) phoneInput.value = '+380';
                if (charCounter) charCounter.textContent = '0 / 500 символів';
            }
        });
    }
});