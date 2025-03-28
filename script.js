// Глобальные переменные
let scene, camera, renderer, dodecahedron;
let isRotating = true;
let isWireframe = false;
let controls;

// Ответы на задачи
const problemAnswers = {
    1: 957.89, // Объем додекаэдра с ребром 5 см
    2: 185.81, // Площадь поверхности додекаэдра с ребром 3 см
    3: 2.38, // Радиус вписанной сферы додекаэдра с ребром 4 см
    4: 7.21, // Длина ребра додекаэдра с описанной сферой радиуса 10 см
    5: 116.57, // Двугранный угол додекаэдра в градусах
    6: 755.2 // Объем додекаэдра вписанного в куб объемом 1000 см³
};

// Константы для формул
const PHI = (1 + Math.sqrt(5)) / 2; // Золотое сечение

// === КАЛЬКУЛЯТОР ===

/**
 * Константы и коэффициенты для формул додекаэдра
 */
const DodecahedronConstants = {
    // Объем: V = (15 + 7√5)/4 × a³
    VOLUME_COEFFICIENT: (15 + 7 * Math.sqrt(5)) / 4,
    
    // Площадь поверхности: S = 3√25 + 10√5 × a²
    SURFACE_AREA_COEFFICIENT: 3 * Math.sqrt(25 + 10 * Math.sqrt(5)),
    
    // Радиус описанной сферы: R = a√3 × (1 + √5)/4
    CIRCUMSCRIBED_RADIUS_COEFFICIENT: Math.sqrt(3) * (1 + Math.sqrt(5)) / 4,
    
    // Радиус вписанной сферы: r = a × (√75 + 30√5)/20
    INSCRIBED_RADIUS_COEFFICIENT: Math.sqrt(75 + 30 * Math.sqrt(5)) / 20
};

/**
 * Инициализирует функциональность калькулятора свойств додекаэдра
 */
function calculateProperties() {
    // Получаем состояние чекбоксов и значения параметров
    const parameters = {
        edge: {
            checked: document.getElementById('edge-checkbox').checked,
            value: parseFloat(document.getElementById('edge-length').value)
        },
        volume: {
            checked: document.getElementById('volume-checkbox').checked,
            value: parseFloat(document.getElementById('volume-value').value)
        },
        surface: {
            checked: document.getElementById('surface-checkbox').checked,
            value: parseFloat(document.getElementById('surface-value').value)
        },
        circumscribed: {
            checked: document.getElementById('circumscribed-checkbox').checked,
            value: parseFloat(document.getElementById('circumscribed-value').value)
        },
        inscribed: {
            checked: document.getElementById('inscribed-checkbox').checked,
            value: parseFloat(document.getElementById('inscribed-value').value)
        }
    };
    
    // Проверяем, что хотя бы один параметр выбран
    const checkedParams = Object.values(parameters).filter(p => p.checked);
    if (checkedParams.length === 0) {
        showCalculationMessage('Пожалуйста, выберите хотя бы один параметр', 'error');
        return;
    }
    
    // Проверяем, что все выбранные параметры имеют корректные значения
    const invalidParams = checkedParams.filter(p => isNaN(p.value) || p.value <= 0);
    if (invalidParams.length > 0) {
        showCalculationMessage('Пожалуйста, введите положительные числа для всех выбранных параметров', 'error');
        return;
    }

    // Если выбрана длина ребра, используем её для расчета всех параметров
    if (parameters.edge.checked) {
        calculateFromEdge(parameters.edge.value);
        return;
    }
    
    // Если выбран только один параметр, вычисляем ребро, затем все остальные параметры
    if (checkedParams.length === 1) {
        let edgeLength;
        const param = checkedParams[0];
        
        if (parameters.volume.checked) {
            edgeLength = Math.pow(parameters.volume.value / DodecahedronConstants.VOLUME_COEFFICIENT, 1/3);
        } else if (parameters.surface.checked) {
            edgeLength = Math.sqrt(parameters.surface.value / DodecahedronConstants.SURFACE_AREA_COEFFICIENT);
        } else if (parameters.circumscribed.checked) {
            edgeLength = parameters.circumscribed.value / DodecahedronConstants.CIRCUMSCRIBED_RADIUS_COEFFICIENT;
        } else if (parameters.inscribed.checked) {
            edgeLength = parameters.inscribed.value / DodecahedronConstants.INSCRIBED_RADIUS_COEFFICIENT;
        }
        
        calculateFromEdge(edgeLength);
        return;
    }
    
    // Если выбрано несколько параметров, проверяем их совместимость
    // Вычисляем длину ребра из каждого параметра и проверяем, совпадают ли значения
    const edgeLengths = [];
    
    if (parameters.volume.checked) {
        edgeLengths.push({
            source: 'volume',
            value: Math.pow(parameters.volume.value / DodecahedronConstants.VOLUME_COEFFICIENT, 1/3)
        });
    }
    
    if (parameters.surface.checked) {
        edgeLengths.push({
            source: 'surface',
            value: Math.sqrt(parameters.surface.value / DodecahedronConstants.SURFACE_AREA_COEFFICIENT)
        });
    }
    
    if (parameters.circumscribed.checked) {
        edgeLengths.push({
            source: 'circumscribed',
            value: parameters.circumscribed.value / DodecahedronConstants.CIRCUMSCRIBED_RADIUS_COEFFICIENT
        });
    }
    
    if (parameters.inscribed.checked) {
        edgeLengths.push({
            source: 'inscribed',
            value: parameters.inscribed.value / DodecahedronConstants.INSCRIBED_RADIUS_COEFFICIENT
        });
    }
    
    // Проверяем, совпадают ли вычисленные длины рёбер (с небольшой погрешностью)
    const tolerance = 0.01; // 1% погрешность
    let isConsistent = true;
    
    for (let i = 1; i < edgeLengths.length; i++) {
        const ratio = edgeLengths[i].value / edgeLengths[0].value;
        if (Math.abs(ratio - 1) > tolerance) {
            isConsistent = false;
            break;
        }
    }
    
    if (!isConsistent) {
        showCalculationMessage('Введенные параметры несовместимы друг с другом. Пожалуйста, проверьте значения.', 'error');
        return;
    }
    
    // Используем среднее значение вычисленных длин рёбер
    const averageEdgeLength = edgeLengths.reduce((sum, item) => sum + item.value, 0) / edgeLengths.length;
    
    calculateFromEdge(averageEdgeLength);
    showCalculationMessage('Расчет успешно выполнен!', 'success');
}

/**
 * Вычисляет все параметры додекаэдра на основе длины ребра
 * @param {number} edgeLength - длина ребра
 */
function calculateFromEdge(edgeLength) {
    // Рассчитываем все свойства на основе найденной длины ребра
    const volume = calculateVolume(edgeLength);
    const surfaceArea = calculateSurfaceArea(edgeLength);
    const circumscribedRadius = calculateCircumscribedRadius(edgeLength);
    const inscribedRadius = calculateInscribedRadius(edgeLength);
    
    // Обновляем результаты на странице
    document.getElementById('edge-result').textContent = edgeLength.toFixed(2) + ' см';
    document.getElementById('volume-result').textContent = volume.toFixed(2) + ' см³';
    document.getElementById('surface-area-result').textContent = surfaceArea.toFixed(2) + ' см²';
    document.getElementById('circumscribed-radius-result').textContent = circumscribedRadius.toFixed(2) + ' см';
    document.getElementById('inscribed-radius-result').textContent = inscribedRadius.toFixed(2) + ' см';
    
    // Обновляем значения полей ввода для несчекнутых параметров
    if (!document.getElementById('edge-checkbox').checked) {
        document.getElementById('edge-length').value = edgeLength.toFixed(2);
    }
    if (!document.getElementById('volume-checkbox').checked) {
        document.getElementById('volume-value').value = volume.toFixed(2);
    }
    if (!document.getElementById('surface-checkbox').checked) {
        document.getElementById('surface-value').value = surfaceArea.toFixed(2);
    }
    if (!document.getElementById('circumscribed-checkbox').checked) {
        document.getElementById('circumscribed-value').value = circumscribedRadius.toFixed(2);
    }
    if (!document.getElementById('inscribed-checkbox').checked) {
        document.getElementById('inscribed-value').value = inscribedRadius.toFixed(2);
    }
}

/**
 * Показывает сообщение о результате расчета
 * @param {string} message - сообщение
 * @param {string} type - тип сообщения ('error' или 'success')
 */
function showCalculationMessage(message, type) {
    const messageElement = document.getElementById('calculation-message');
    
    // Проверяем, есть ли у нас переведённые сообщения
    if (window.calculatorMessages) {
        // Определяем тип сообщения и выбираем соответствующий перевод
        if (type === 'error') {
            if (message.includes('выберите хотя бы один параметр')) {
                message = window.calculatorMessages.errorNoParameters;
            } else if (message.includes('введите положительные числа')) {
                message = window.calculatorMessages.errorInvalidValues;
            } else if (message.includes('максимум 2 параметра')) {
                message = window.calculatorMessages.errorTooMany;
            } else if (message.includes('несовместимы')) {
                message = window.calculatorMessages.errorInconsistent;
            }
        } else if (type === 'success') {
            message = window.calculatorMessages.successMessage;
        }
    }
    
    messageElement.textContent = message;
    messageElement.className = type === 'error' ? 'error-message' : 'success-message';
    
    // Сбрасываем сообщение через 5 секунд
    setTimeout(() => {
        messageElement.textContent = '';
        messageElement.className = '';
    }, 5000);
}

/**
 * Обработчик изменения состояния чекбокса параметра
 * @param {Event} event - событие изменения
 */
function handleParameterCheckboxChange(event) {
    const checkbox = event.target;
    const parameterId = checkbox.id.replace('-checkbox', '');
    const inputElement = document.getElementById(`${parameterId}-value`);
    
    // Включаем/выключаем поле ввода в зависимости от состояния чекбокса
    inputElement.disabled = !checkbox.checked;
    
    // Ограничиваем максимальное количество выбранных параметров до 2
    const checkedBoxes = document.querySelectorAll('.parameter-checkbox:checked');
    if (checkedBoxes.length > 2) {
        // Если выбрано больше 2 параметров, снимаем выбор с текущего
        checkbox.checked = false;
        inputElement.disabled = true;
        showCalculationMessage('Можно выбрать максимум 2 параметра одновременно', 'error');
    }
    
    // Обновляем внешний вид контейнера
    const container = document.getElementById(`${parameterId}-value-container`);
    if (checkbox.checked) {
        container.classList.add('active');
    } else {
        container.classList.remove('active');
    }
}

/**
 * Функционал для переключения языка
 */
function initLanguageToggle() {
    const languageToggle = document.getElementById('language-switch');
    let currentLanguage = 'ru';
    
    const translations = {
        ru: {
            // Навигация и шапка
            modelLink: '3D Модель',
            historyLink: 'История',
            calculatorLink: 'Калькулятор',
            problemsLink: 'Задачи',
            logoText: 'Додекаэдр',
            
            // Сплеш экран
            splashTitle: 'Додекаэдр',
            
            // Основной контент
            heroTitle: 'Изучите магию додекаэдра',
            heroSubtitle: 'Один из пяти платоновых тел с 12 гранями, 30 рёбрами и 20 вершинами',
            
            // Секция 3D модели
            modelTitle: '3D Модель',
            rotateButton: 'Вращение',
            wireframeButton: 'Каркас',
            colorLabel: 'Цвет модели:',
            
            // Секция истории
            historyTitle: 'История додекаэдра',
            historySubtitle1: 'Древние истоки',
            historyText1: 'Додекаэдр был известен ещё пифагорейцам (VI век до н. э.) и считался символом вселенной. Платон в диалоге «Тимей» связывал додекаэдр с "космосом", предполагая, что это форма Вселенной.',
            historySubtitle2: 'В руках мастеров и учёных',
            historyText2: 'Архимед, Евклид и другие древнегреческие математики изучали свойства додекаэдра и включали его в свои труды. В эпоху Возрождения художники и учёные, такие как Леонардо да Винчи и Кеплер, были очарованы его симметрией.',
            historySubtitle3: 'Современное значение',
            historyText3: 'Сегодня додекаэдр нашёл применение в различных областях: от кристаллографии до молекулярной биологии. Некоторые вирусы имеют додекаэдрическую форму. В популярной культуре додекаэдр известен как 12-гранный игральный кубик (D12) в настольных играх.',
            imageCaption: 'Римский бронзовый додекаэдр (I-II век н.э.)',
            
            // Секция калькулятора
            calculatorTitle: 'Калькулятор свойств додекаэдра',
            parametersTitle: 'Выберите известные параметры (не более двух):',
            edgeLabel: 'Длина ребра (a)',
            volumeLabel: 'Объем (V)',
            surfaceLabel: 'Площадь поверхности (S)',
            circumscribedLabel: 'Радиус описанной сферы (R)',
            inscribedLabel: 'Радиус вписанной сферы (r)',
            calculateButton: 'Рассчитать',
            resultsTitle: 'Результаты расчета:',
            edgeResult: 'Длина ребра (a)',
            volumeResult: 'Объем (V)',
            surfaceResult: 'Площадь поверхности (S)',
            circumscribedResult: 'Радиус описанной сферы (R)',
            inscribedResult: 'Радиус вписанной сферы (r)',
            errorTooMany: 'Можно выбрать максимум 2 параметра одновременно',
            errorNoParameters: 'Пожалуйста, выберите хотя бы один параметр',
            errorInvalidValues: 'Пожалуйста, введите положительные числа для всех выбранных параметров',
            errorInconsistent: 'Введенные параметры несовместимы друг с другом. Пожалуйста, проверьте значения.',
            successMessage: 'Расчет успешно выполнен!',
            
            // Футер
            aboutProject: 'О проекте',
            aboutText: 'Этот сайт создан для изучения додекаэдра и его математических свойств.',
            navigationTitle: 'Навигация',
            resourcesTitle: 'Ресурсы',
            wikipediaLink: 'Википедия',
            mathworldLink: 'Wolfram MathWorld',
            
            // Страница задач
            problemsTitle: 'Задачи по додекаэдру',
            problemsSubtitle: 'Проверьте свои знания и навыки',
            difficultyAll: 'Все',
            difficultyEasy: 'Легкие',
            difficultyMedium: 'Средние',
            difficultyHard: 'Сложные',
            problemPrefix: 'Задача',
            hintShow: 'Показать подсказку',
            hintHide: 'Скрыть подсказку',
            checkAnswer: 'Проверить',
            answerPlaceholder: 'Ваш ответ',
            correctAnswer: 'Правильно! Отличная работа.',
            incorrectAnswer: 'Неправильно. Попробуйте еще раз.',
            enterNumber: 'Пожалуйста, введите число.'
        },
        en: {
            // Navigation and header
            modelLink: '3D Model',
            historyLink: 'History',
            calculatorLink: 'Calculator',
            problemsLink: 'Problems',
            logoText: 'Dodecahedron',
            
            // Splash screen
            splashTitle: 'Dodecahedron',
            
            // Main content
            heroTitle: 'Explore the magic of dodecahedron',
            heroSubtitle: 'One of the five platonic solids with 12 faces, 30 edges and 20 vertices',
            
            // 3D model section
            modelTitle: '3D Model',
            rotateButton: 'Rotation',
            wireframeButton: 'Wireframe',
            colorLabel: 'Model color:',
            
            // History section
            historyTitle: 'Dodecahedron History',
            historySubtitle1: 'Ancient origins',
            historyText1: 'The dodecahedron was known to the Pythagoreans (6th century BC) and was considered a symbol of the universe. Plato, in his dialogue "Timaeus," associated the dodecahedron with the "cosmos," suggesting it was the shape of the Universe.',
            historySubtitle2: 'In the hands of masters and scientists',
            historyText2: 'Archimedes, Euclid, and other ancient Greek mathematicians studied the properties of the dodecahedron and included it in their works. During the Renaissance, artists and scientists like Leonardo da Vinci and Kepler were fascinated by its symmetry.',
            historySubtitle3: 'Modern significance',
            historyText3: 'Today, the dodecahedron has found applications in various fields: from crystallography to molecular biology. Some viruses have a dodecahedral shape. In popular culture, the dodecahedron is known as a 12-sided die (D12) in tabletop games.',
            imageCaption: 'Roman bronze dodecahedron (1st-2nd century CE)',
            
            // Calculator section
            calculatorTitle: 'Dodecahedron Properties Calculator',
            parametersTitle: 'Select known parameters (maximum 2):',
            edgeLabel: 'Edge length (a)',
            volumeLabel: 'Volume (V)',
            surfaceLabel: 'Surface area (S)',
            circumscribedLabel: 'Circumscribed sphere radius (R)',
            inscribedLabel: 'Inscribed sphere radius (r)',
            calculateButton: 'Calculate',
            resultsTitle: 'Calculation results:',
            edgeResult: 'Edge length (a)',
            volumeResult: 'Volume (V)',
            surfaceResult: 'Surface area (S)',
            circumscribedResult: 'Circumscribed sphere radius (R)',
            inscribedResult: 'Inscribed sphere radius (r)',
            errorTooMany: 'You can select a maximum of 2 parameters at once',
            errorNoParameters: 'Please select at least one parameter',
            errorInvalidValues: 'Please enter positive numbers for all selected parameters',
            errorInconsistent: 'The entered parameters are incompatible. Please check your values.',
            successMessage: 'Calculation completed successfully!',
            
            // Footer
            aboutProject: 'About Project',
            aboutText: 'This website was created to study the dodecahedron and its mathematical properties.',
            navigationTitle: 'Navigation',
            resourcesTitle: 'Resources',
            wikipediaLink: 'Wikipedia',
            mathworldLink: 'Wolfram MathWorld',
            
            // Problems page
            problemsTitle: 'Dodecahedron Problems',
            problemsSubtitle: 'Test your knowledge and skills',
            difficultyAll: 'All',
            difficultyEasy: 'Easy',
            difficultyMedium: 'Medium',
            difficultyHard: 'Hard',
            problemPrefix: 'Problem',
            hintShow: 'Show hint',
            hintHide: 'Hide hint',
            checkAnswer: 'Check',
            answerPlaceholder: 'Your answer',
            correctAnswer: 'Correct! Great job.',
            incorrectAnswer: 'Incorrect. Try again.',
            enterNumber: 'Please enter a number.'
        }
    };
    
    // Добавляем обработчик события для перевода сплеш-экрана
    // Этот обработчик сработает до того, как сплеш-экран исчезнет
    setTimeout(() => {
        const splashTitle = document.querySelector('.splash-title');
        if (splashTitle && currentLanguage === 'en') {
            splashTitle.textContent = translations.en.splashTitle;
        }
    }, 100);
    
    // Функция для перевода страницы
    function translatePage(language) {
        // Обновляем текст сплеш-экрана, если он еще виден
        const splashTitle = document.querySelector('.splash-title');
        if (splashTitle) {
            splashTitle.textContent = translations[language].splashTitle;
        }
        
        // Основная навигация
        const navItems = {
            modelLink: document.querySelector('nav ul li:nth-child(1) a'),
            historyLink: document.querySelector('nav ul li:nth-child(2) a'),
            calculatorLink: document.querySelector('nav ul li:nth-child(3) a'),
            problemsLink: document.querySelector('nav ul li:nth-child(4) a'),
            logoText: document.querySelector('.logo span')
        };
        
        // Секция героя
        const heroItems = {
            heroTitle: document.querySelector('.hero-content h2'),
            heroSubtitle: document.querySelector('.hero-content p')
        };
        
        // Секция 3D модели
        const modelItems = {
            modelTitle: document.querySelector('#model h2'),
            rotateButton: document.querySelector('#rotate-toggle'),
            wireframeButton: document.querySelector('#wireframe-toggle'),
            colorLabel: document.querySelector('.color-controls label')
        };
        
        // Секция истории
        const historyItems = {
            historyTitle: document.querySelector('#history h2'),
            historySubtitle1: document.querySelector('.history-text h3:nth-child(1)'),
            historyText1: document.querySelector('.history-text p:nth-child(2)'),
            historySubtitle2: document.querySelector('.history-text h3:nth-child(3)'),
            historyText2: document.querySelector('.history-text p:nth-child(4)'),
            historySubtitle3: document.querySelector('.history-text h3:nth-child(5)'),
            historyText3: document.querySelector('.history-text p:nth-child(6)'),
            imageCaption: document.querySelector('.caption')
        };
        
        // Секция калькулятора
        const calculatorItems = {
            calculatorTitle: document.querySelector('#calculator h2'),
            parametersTitle: document.querySelector('.parameter-selection p'),
            edgeLabel: document.querySelector('#edge-checkbox').parentNode.textContent.trim(),
            volumeLabel: document.querySelector('#volume-checkbox').parentNode.textContent.trim(),
            surfaceLabel: document.querySelector('#surface-checkbox').parentNode.textContent.trim(),
            circumscribedLabel: document.querySelector('#circumscribed-checkbox').parentNode.textContent.trim(),
            inscribedLabel: document.querySelector('#inscribed-checkbox').parentNode.textContent.trim(),
            calculateButton: document.querySelector('#calculate-btn'),
            resultsTitle: document.querySelector('.results-container h3'),
            edgeResult: document.querySelector('#edge-result-card h4'),
            volumeResult: document.querySelector('#volume-result-card h4'),
            surfaceResult: document.querySelector('#surface-area-result-card h4'),
            circumscribedResult: document.querySelector('#circumscribed-radius-result-card h4'),
            inscribedResult: document.querySelector('#inscribed-radius-result-card h4')
        };
        
        // Футер
        const footerItems = {
            aboutProject: document.querySelector('.footer-section:nth-child(1) h3'),
            aboutText: document.querySelector('.footer-section:nth-child(1) p'),
            navigationTitle: document.querySelector('.footer-section:nth-child(2) h3'),
            resourcesTitle: document.querySelector('.footer-section:nth-child(3) h3'),
            wikipediaLink: document.querySelector('.footer-section:nth-child(3) ul li:nth-child(1) a'),
            mathworldLink: document.querySelector('.footer-section:nth-child(3) ul li:nth-child(2) a')
        };
        
        // Объединяем все элементы для упрощения перебора
        const allElements = {...navItems, ...heroItems, ...modelItems, ...historyItems, ...calculatorItems, ...footerItems};
        
        // Перебираем все элементы и меняем их содержимое
        for (const [key, element] of Object.entries(allElements)) {
            if (element && translations[language][key]) {
                // Особая обработка для элементов с иконками
                if (key === 'rotateButton' || key === 'wireframeButton') {
                    const icon = element.querySelector('i');
                    if (icon) {
                        const iconHTML = icon.outerHTML;
                        element.innerHTML = iconHTML + ' ' + translations[language][key];
                    } else {
                        element.textContent = translations[language][key];
                    }
                }
                // Особая обработка для элементов с чекбоксами
                else if (key.endsWith('Label') && key !== 'colorLabel') {
                    // Находим родительский элемент label
                    const labelElement = document.querySelector(`#${key.replace('Label', '')}-checkbox`).parentNode;
                    // Сохраняем чекбокс
                    const checkbox = labelElement.querySelector('input[type="checkbox"]');
                    // Обновляем текст, сохраняя чекбокс в начале
                    labelElement.innerHTML = '';
                    labelElement.appendChild(checkbox);
                    labelElement.appendChild(document.createTextNode(' ' + translations[language][key]));
                }
                else {
                    element.textContent = translations[language][key];
                }
            }
        }
        
        // Обновляем сообщения об ошибках для функции калькулятора
        // Это не отображаемые элементы, но мы обновляем строки, которые могут появиться
        window.calculatorMessages = {
            errorTooMany: translations[language].errorTooMany,
            errorNoParameters: translations[language].errorNoParameters,
            errorInvalidValues: translations[language].errorInvalidValues,
            errorInconsistent: translations[language].errorInconsistent,
            successMessage: translations[language].successMessage
        };
        
        // Страница задач - если мы на ней
        const problemsPage = document.querySelector('.problems-list');
        if (problemsPage) {
            // Заголовок страницы задач
            document.querySelector('.problems-header h2').textContent = translations[language].problemsTitle;
            document.querySelector('.problems-header p').textContent = translations[language].problemsSubtitle;
            
            // Кнопки фильтра
            document.querySelector('.difficulty-btn[data-difficulty="all"]').textContent = translations[language].difficultyAll;
            document.querySelector('.difficulty-btn[data-difficulty="easy"]').textContent = translations[language].difficultyEasy;
            document.querySelector('.difficulty-btn[data-difficulty="medium"]').textContent = translations[language].difficultyMedium;
            document.querySelector('.difficulty-btn[data-difficulty="hard"]').textContent = translations[language].difficultyHard;
            
            // Карточки задач
            document.querySelectorAll('.problem-card').forEach((card, index) => {
                // Номер задачи
                card.querySelector('.problem-number').textContent = `${translations[language].problemPrefix} ${index + 1}`;
                
                // Кнопка подсказки
                const hintBtn = card.querySelector('.hint-btn');
                const hintText = card.querySelector('.problem-hint');
                if (hintBtn) {
                    if (hintText.classList.contains('hidden')) {
                        hintBtn.innerHTML = `<i class="fas fa-lightbulb"></i> ${translations[language].hintShow}`;
                    } else {
                        hintBtn.innerHTML = `<i class="fas fa-times"></i> ${translations[language].hintHide}`;
                    }
                }
                
                // Кнопка проверки
                const checkBtn = card.querySelector('.check-btn');
                if (checkBtn) {
                    checkBtn.textContent = translations[language].checkAnswer;
                }
                
                // Placeholder для ввода ответа
                const answerInput = card.querySelector('.solution-input input');
                if (answerInput) {
                    answerInput.placeholder = translations[language].answerPlaceholder;
                }
            });
            
            // Обновляем сообщения для проверки ответов
            window.problemMessages = {
                correctAnswer: translations[language].correctAnswer,
                incorrectAnswer: translations[language].incorrectAnswer,
                enterNumber: translations[language].enterNumber
            };
        }

        // Для футера, важно обновить все ссылки в навигационном разделе
        const footerNavigationLinks = document.querySelectorAll('.footer-section:nth-child(2) ul li a');
        if (footerNavigationLinks.length > 0) {
            footerNavigationLinks.forEach((link, index) => {
                switch(index) {
                    case 0:
                        link.textContent = translations[language].modelLink;
                        break;
                    case 1:
                        link.textContent = translations[language].historyLink;
                        break;
                    case 2:
                        link.textContent = translations[language].calculatorLink;
                        break;
                    case 3:
                        link.textContent = translations[language].problemsLink;
                        break;
                }
            });
        }
    }
    
    // Добавляем обработчик клика по кнопке переключения языка
    if (languageToggle) {
        languageToggle.addEventListener('click', function() {
            currentLanguage = currentLanguage === 'ru' ? 'en' : 'ru';
            languageToggle.textContent = currentLanguage === 'ru' ? 'EN' : 'RU';
            translatePage(currentLanguage);
            
            // Сохраняем выбранный язык в localStorage
            localStorage.setItem('language', currentLanguage);
        });
        
        // Проверяем сохранённый язык и применяем его при загрузке
        const savedLanguage = localStorage.getItem('language');
        if (savedLanguage) {
            currentLanguage = savedLanguage;
            languageToggle.textContent = currentLanguage === 'ru' ? 'EN' : 'RU';
            translatePage(currentLanguage);
        }
    }
    
    // Экспортируем функции для использования в других частях кода
    window.translate = {
        getCurrentLanguage: () => currentLanguage,
        translatePage: translatePage
    };
}

/**
 * Инициализация и настройка сплеш-экрана
 */
function setupSplashScreen() {
    // Скрываем скролл на время показа сплеш-экрана
    document.body.style.overflow = 'hidden';
    
    // После скрытия сплеш-экрана восстанавливаем скролл
    setTimeout(() => {
        document.body.style.overflow = '';
    }, 1500); // Задержка немного больше, чем анимация сплеш-экрана
}

/**
 * Функционал скрытия верхней навигации при прокрутке вниз
 */
function initScrollHeader() {
    let lastScroll = 0;
    const header = document.querySelector('header');
    const scrollThreshold = 100; // Порог прокрутки для начала скрытия
    
    // Добавляем атрибут для начальной высоты хедера
    const headerHeight = header.offsetHeight;
    document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        // Если прокручено меньше порогового значения, показываем хедер
        if (currentScroll <= scrollThreshold) {
            header.style.transform = 'translateY(0)';
            return;
        }
        
        // Если скролл вниз - скрываем хедер
        if (currentScroll > lastScroll && !header.classList.contains('scrolled-down')) {
            header.style.transform = `translateY(-${headerHeight}px)`;
            header.classList.add('scrolled-down');
            header.classList.remove('scrolled-up');
        } 
        // Если скролл вверх - показываем хедер
        else if (currentScroll < lastScroll && header.classList.contains('scrolled-down')) {
            header.style.transform = 'translateY(0)';
            header.classList.remove('scrolled-down');
            header.classList.add('scrolled-up');
        }
        
        lastScroll = currentScroll;
    });
}

// Добавляем и обрабатываем события страницы
document.addEventListener('DOMContentLoaded', function() {
    setupSplashScreen();
    
    // Инициализация скрытия хедера при скролле
    initScrollHeader();
    
    // Инициализация переключателя темы
    initThemeToggle();
    
    // Инициализация 3D модели, если есть контейнер для неё
    if (document.getElementById('dodecahedron-model')) {
        initDodecahedronModel();
        
        // Добавляем обработчики для кнопок управления моделью
        document.getElementById('rotate-toggle').addEventListener('click', toggleRotation);
        document.getElementById('wireframe-toggle').addEventListener('click', toggleWireframe);
        document.getElementById('model-color').addEventListener('input', changeModelColor);
    }
    
    // Инициализация калькулятора, если мы на странице с калькулятором
    if (document.getElementById('calculate-btn')) {
        document.getElementById('calculate-btn').addEventListener('click', calculateProperties);
        
        // Добавляем обработчики для чекбоксов параметров
        document.querySelectorAll('.parameter-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', handleParameterCheckboxChange);
            
            // Инициализируем начальное состояние
            const event = new Event('change');
            checkbox.dispatchEvent(event);
        });
        
        // Устанавливаем начальные значения полей ввода на основе длины ребра = 1
        const edgeLength = 1;
        document.getElementById('volume-value').value = calculateVolume(edgeLength).toFixed(2);
        document.getElementById('surface-value').value = calculateSurfaceArea(edgeLength).toFixed(2);
        document.getElementById('circumscribed-value').value = calculateCircumscribedRadius(edgeLength).toFixed(2);
        document.getElementById('inscribed-value').value = calculateInscribedRadius(edgeLength).toFixed(2);
    }
    
    // Инициализация страницы с задачами, если мы на ней
    if (document.querySelector('.problems-list')) {
        initProblemPage();
    }

    // Плавная прокрутка для якорных ссылок
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            
            const targetId = this.getAttribute('href');
            if (targetId === '#') return;
            
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth'
                });
            }
        });
    });

    // Инициализация переключателя языка
    initLanguageToggle();
});

// === ФУНКЦИИ ТЕМЫ ===

/**
 * Инициализирует переключатель темы
 */
function initThemeToggle() {
    const themeSwitch = document.getElementById('theme-switch');
    
    // Проверяем сохраненную тему или предпочтения системы
    const savedTheme = localStorage.getItem('theme');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Устанавливаем начальное состояние
    if (savedTheme === 'dark' || (!savedTheme && prefersDarkScheme.matches)) {
        document.body.classList.add('dark-theme');
        document.body.classList.remove('light-theme');
        themeSwitch.checked = true;
    }
    
    // Обработчик переключения темы
    themeSwitch.addEventListener('change', () => {
        if (themeSwitch.checked) {
            document.body.classList.add('dark-theme');
            document.body.classList.remove('light-theme');
            localStorage.setItem('theme', 'dark');
        } else {
            document.body.classList.add('light-theme');
            document.body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
        }
    });
}

// === 3D МОДЕЛЬ ДОДЕКАЭДРА ===

/**
 * Инициализирует 3D сцену и модель додекаэдра
 */
function initDodecahedronModel() {
    // Получаем контейнер и его размеры
    const container = document.getElementById('dodecahedron-model');
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Создаем сцену, камеру и рендерер
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);
    
    // Добавляем освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7);
    scene.add(directionalLight);
    
    // Создаем геометрию додекаэдра
    const geometry = new THREE.DodecahedronGeometry(2, 0);
    const material = new THREE.MeshPhongMaterial({
        color: 0x3498db,
        flatShading: true,
        polygonOffset: true,
        polygonOffsetFactor: 1,
        polygonOffsetUnits: 1
    });
    
    // Создаем каркас
    const wireframeMaterial = new THREE.LineBasicMaterial({ color: 0x000000, linewidth: 1 });
    const edges = new THREE.EdgesGeometry(geometry);
    const wireframe = new THREE.LineSegments(edges, wireframeMaterial);
    
    // Создаем додекаэдр и добавляем каркас
    dodecahedron = new THREE.Mesh(geometry, material);
    dodecahedron.add(wireframe);
    wireframe.visible = false; // Изначально каркас невидим
    scene.add(dodecahedron);
    
    // Устанавливаем позицию камеры
    camera.position.z = 6;
    
    // Добавляем контроллер орбиты для взаимодействия с мышью
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    
    // Начинаем анимацию
    animate();
    
    // Обработчик изменения размера окна
    window.addEventListener('resize', () => {
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        
        renderer.setSize(width, height);
    });
}

/**
 * Анимация вращения 3D модели
 */
function animate() {
    requestAnimationFrame(animate);
    
    // Вращаем додекаэдр, если включено вращение
    if (isRotating) {
        dodecahedron.rotation.x += 0.005;
        dodecahedron.rotation.y += 0.01;
    }
    
    controls.update();
    renderer.render(scene, camera);
}

/**
 * Включает/выключает автоматическое вращение додекаэдра
 */
function toggleRotation() {
    isRotating = !isRotating;
    const button = document.getElementById('rotate-toggle');
    
    if (isRotating) {
        button.innerHTML = '<i class="fas fa-sync-alt"></i> Вращение';
        button.classList.remove('active');
    } else {
        button.innerHTML = '<i class="fas fa-pause"></i> Пауза';
        button.classList.add('active');
    }
}

/**
 * Включает/выключает отображение каркаса додекаэдра
 */
function toggleWireframe() {
    isWireframe = !isWireframe;
    const button = document.getElementById('wireframe-toggle');
    
    // Переключаем видимость каркаса
    dodecahedron.children[0].visible = isWireframe;
    
    if (isWireframe) {
        button.classList.add('active');
    } else {
        button.classList.remove('active');
    }
}

/**
 * Изменяет цвет модели додекаэдра
 */
function changeModelColor(event) {
    const color = event.target.value;
    dodecahedron.material.color.set(color);
}

// === СТРАНИЦА ЗАДАЧ ===

/**
 * Инициализирует функциональность страницы с задачами
 */
function initProblemPage() {
    // Добавляем обработчики для кнопок проверки ответов
    document.querySelectorAll('.check-btn').forEach((button, index) => {
        button.addEventListener('click', () => {
            checkAnswer(index + 1, button.closest('.problem-solution'));
        });
    });
    
    // Добавляем обработчики для кнопок фильтра по сложности
    document.querySelectorAll('.difficulty-btn').forEach(button => {
        button.addEventListener('click', () => {
            filterProblemsByDifficulty(button.dataset.difficulty);
            
            // Обновляем активную кнопку
            document.querySelectorAll('.difficulty-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            button.classList.add('active');
        });
    });
    
    // Добавляем обработчики для полей ввода (проверка при нажатии Enter)
    document.querySelectorAll('.solution-input input').forEach((input, index) => {
        input.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                checkAnswer(index + 1, input.closest('.problem-solution'));
            }
        });
    });
    
    // Добавляем обработчики для кнопок подсказок
    document.querySelectorAll('.hint-btn').forEach(button => {
        button.addEventListener('click', () => {
            // Находим контейнер подсказки и сам текст подсказки
            const hintContainer = button.closest('.hint-container');
            const hintText = hintContainer.querySelector('.problem-hint');
            
            // Переключаем видимость подсказки
            hintText.classList.toggle('hidden');
            
            // Меняем текст кнопки и её стиль
            if (hintText.classList.contains('hidden')) {
                button.innerHTML = '<i class="fas fa-lightbulb"></i> Показать подсказку';
                button.classList.remove('active');
            } else {
                button.innerHTML = '<i class="fas fa-times"></i> Скрыть подсказку';
                button.classList.add('active');
                
                // Если используется MathJax, перерендерим формулы
                if (typeof MathJax !== 'undefined') {
                    MathJax.typeset([hintText]);
                }
            }
        });
    });
}

/**
 * Проверяет ответ пользователя на задачу
 * @param {number} problemNumber - номер задачи
 * @param {HTMLElement} solutionElement - элемент с решением
 */
function checkAnswer(problemNumber, solutionElement) {
    const input = solutionElement.querySelector('input');
    const feedback = solutionElement.querySelector('.solution-feedback');
    const userAnswer = parseFloat(input.value);
    
    let enterNumberMessage = 'Пожалуйста, введите число.';
    let correctAnswerMessage = 'Правильно! Отличная работа.';
    let incorrectAnswerMessage = 'Неправильно. Попробуйте еще раз.';
    
    // Используем переведённые сообщения, если они доступны
    if (window.problemMessages) {
        enterNumberMessage = window.problemMessages.enterNumber;
        correctAnswerMessage = window.problemMessages.correctAnswer;
        incorrectAnswerMessage = window.problemMessages.incorrectAnswer;
    }
    
    if (isNaN(userAnswer)) {
        feedback.textContent = enterNumberMessage;
        feedback.className = 'solution-feedback incorrect';
        return;
    }
    
    const correctAnswer = problemAnswers[problemNumber];
    const tolerance = 0.1; // Допустимая погрешность
    
    if (Math.abs(userAnswer - correctAnswer) <= tolerance) {
        feedback.textContent = correctAnswerMessage;
        feedback.className = 'solution-feedback correct';
    } else {
        feedback.textContent = incorrectAnswerMessage;
        feedback.className = 'solution-feedback incorrect';
    }
}

/**
 * Фильтрует задачи по уровню сложности
 * @param {string} difficulty - уровень сложности (easy, medium, hard, all)
 */
function filterProblemsByDifficulty(difficulty) {
    const problems = document.querySelectorAll('.problem-card');
    
    problems.forEach(problem => {
        if (difficulty === 'all' || problem.dataset.difficulty === difficulty) {
            problem.style.display = 'block';
        } else {
            problem.style.display = 'none';
        }
    });
}

/**
 * Вычисляет объем додекаэдра
 * @param {number} a - длина ребра
 * @return {number} объем
 */
function calculateVolume(a) {
    return DodecahedronConstants.VOLUME_COEFFICIENT * Math.pow(a, 3);
}

/**
 * Вычисляет площадь поверхности додекаэдра
 * @param {number} a - длина ребра
 * @return {number} площадь поверхности
 */
function calculateSurfaceArea(a) {
    return DodecahedronConstants.SURFACE_AREA_COEFFICIENT * Math.pow(a, 2);
}

/**
 * Вычисляет радиус описанной сферы додекаэдра
 * @param {number} a - длина ребра
 * @return {number} радиус описанной сферы
 */
function calculateCircumscribedRadius(a) {
    return DodecahedronConstants.CIRCUMSCRIBED_RADIUS_COEFFICIENT * a;
}

/**
 * Вычисляет радиус вписанной сферы додекаэдра
 * @param {number} a - длина ребра
 * @return {number} радиус вписанной сферы
 */
function calculateInscribedRadius(a) {
    return DodecahedronConstants.INSCRIBED_RADIUS_COEFFICIENT * a;
} 