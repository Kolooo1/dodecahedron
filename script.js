// Глобальные переменные
let scene, camera, renderer, dodecahedron;
let isRotating = true;
let isWireframe = false;
let controls;

// Отслеживание решенных задач
const solvedProblems = {
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false
};

// Ответы на задачи
const problemAnswers = {
    1: 957.89, // Объем додекаэдра с ребром 5 см
    2: 185.81, // Площадь поверхности додекаэдра с ребром 3 см
    3: 2.38, // Радиус вписанной сферы додекаэдра с ребром 4 см
    4: 7.14, // Длина ребра додекаэдра с описанной сферой радиуса 10 см
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
            formulasLink: 'Формулы',
            memesLink: 'Мемы',
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
            enterNumber: 'Пожалуйста, введите число.',
            
            // Модальное окно достижения
            achievementTitle: 'Вы стали Мастером Додекаэдра!',
            achievementDescription: 'Поздравляем! Вы успешно решили все задачи и продемонстрировали глубокое понимание свойств додекаэдра. Теперь вы настоящий мастер этой удивительной геометрической фигуры!',
            achievementButton: 'Принять награду',
            
            // Раздел формул
            formulasTitle: 'Справочник формул додекаэдра',
            basicCharacteristics: 'Основные характеристики',
            additionalCharacteristics: 'Дополнительные характеристики',
            derivedValues: 'Производные величины',
            volumeFormula: 'Объем',
            surfaceAreaFormula: 'Площадь поверхности',
            inscribedRadiusFormula: 'Радиус вписанной сферы',
            circumscribedRadiusFormula: 'Радиус описанной сферы',
            dihedralAngleFormula: 'Двугранный угол',
            centerToFaceFormula: 'Расстояние от центра до грани',
            faceAreaFormula: 'Площадь грани (пятиугольника)',
            faceDiagonalFormula: 'Диагональ грани',
            edgeFromVolumeFormula: 'Длина ребра через объем',
            edgeFromSurfaceFormula: 'Длина ребра через площадь',
            edgeFromCircumscribedFormula: 'Длина ребра через радиус R',
            edgeFromInscribedFormula: 'Длина ребра через радиус r',
            whereEdge: 'где \\(a\\) - длина ребра додекаэдра',
            whereVolume: 'где \\(V\\) - объем додекаэдра',
            whereSurface: 'где \\(S\\) - площадь поверхности',
            whereCircumscribed: 'где \\(R\\) - радиус описанной сферы',
            whereInscribed: 'где \\(r\\) - радиус вписанной сферы',
            dihedralAngleDescription: 'Угол между соседними гранями додекаэдра',
            
            // Раздел мемов
            memesTitle: 'Мемы о додекаэдре',
            geometricHumor: 'Геометрический юмор',
            alwaysOnTime: 'Всегда вовремя',
            inTheBar: 'В баре',
            gameEnthusiast: 'Игровой энтузиаст',
            inTheGym: 'В спортзале',
            inTheCafe: 'В кафе',
            interview: 'Интервью',
            realCompliment: 'Настоящий комплимент',
        },
        en: {
            // Navigation and header
            modelLink: '3D Model',
            historyLink: 'History',
            calculatorLink: 'Calculator',
            formulasLink: 'Formulas',
            memesLink: 'Memes',
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
            enterNumber: 'Please enter a number.',
            
            // Achievement modal
            achievementTitle: 'You are now a Dodecahedron Master!',
            achievementDescription: 'Congratulations! You have successfully solved all problems and demonstrated a deep understanding of dodecahedron properties. You are now a true master of this amazing geometric figure!',
            achievementButton: 'Accept reward',
            
            // Formulas section
            formulasTitle: 'Dodecahedron Formulas Reference',
            basicCharacteristics: 'Basic Characteristics',
            additionalCharacteristics: 'Additional Characteristics',
            derivedValues: 'Derived Values',
            volumeFormula: 'Volume',
            surfaceAreaFormula: 'Surface Area',
            inscribedRadiusFormula: 'Inscribed Sphere Radius',
            circumscribedRadiusFormula: 'Circumscribed Sphere Radius',
            dihedralAngleFormula: 'Dihedral Angle',
            centerToFaceFormula: 'Distance from Center to Face',
            faceAreaFormula: 'Face Area (Pentagon)',
            faceDiagonalFormula: 'Face Diagonal',
            edgeFromVolumeFormula: 'Edge Length from Volume',
            edgeFromSurfaceFormula: 'Edge Length from Surface Area',
            edgeFromCircumscribedFormula: 'Edge Length from Radius R',
            edgeFromInscribedFormula: 'Edge Length from Radius r',
            whereEdge: 'where \\(a\\) is the edge length of the dodecahedron',
            whereVolume: 'where \\(V\\) is the volume of the dodecahedron',
            whereSurface: 'where \\(S\\) is the surface area',
            whereCircumscribed: 'where \\(R\\) is the circumscribed sphere radius',
            whereInscribed: 'where \\(r\\) is the inscribed sphere radius',
            dihedralAngleDescription: 'Angle between adjacent faces of the dodecahedron',
            
            // Memes section
            memesTitle: 'Dodecahedron Memes',
            geometricHumor: 'Geometric Humor',
            alwaysOnTime: 'Always on Time',
            inTheBar: 'In the Bar',
            gameEnthusiast: 'Game Enthusiast',
            inTheGym: 'In the Gym',
            inTheCafe: 'In the Cafe',
            interview: 'Interview',
            realCompliment: 'Real Compliment',
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
        // Устанавливаем язык и сохраняем его в хранилище
        currentLanguage = language;
        localStorage.setItem('language', language);
        
        // Обновляем текст кнопки переключателя языка
        const languageButton = document.getElementById('language-switch');
        languageButton.textContent = language === 'ru' ? 'EN' : 'RU';
        
        // Получаем все элементы, которые требуют перевода
        // === НАВИГАЦИЯ ===
        const navigationItems = document.querySelectorAll('nav ul li a');
        
        if (navigationItems.length > 0) {
            // Раздел с 3D моделью
            navigationItems[0].textContent = translations[language].modelLink;
            
            // Раздел с историей
            navigationItems[1].textContent = translations[language].historyLink;
            
            // Раздел с калькулятором
            navigationItems[2].textContent = translations[language].calculatorLink;
            
            // Раздел с формулами
            navigationItems[3].textContent = translations[language].formulasLink;
            
            // Раздел с мемами
            navigationItems[4].textContent = translations[language].memesLink;
            
            // Раздел с задачами
            navigationItems[5].textContent = translations[language].problemsLink;
        }
        
        // === ГЛАВНАЯ СТРАНИЦА ===
        // Проверяем, находимся ли мы на главной странице (наличие hero раздела)
        const heroSection = document.getElementById('hero');
        
        if (heroSection) {
            // Герой раздел
            const heroTitle = heroSection.querySelector('h2');
            const heroSubtitle = heroSection.querySelector('p');
            
            if (heroTitle) heroTitle.textContent = translations[language].heroTitle;
            if (heroSubtitle) heroSubtitle.textContent = translations[language].heroSubtitle;
            
            // 3D Модель
            const modelSection = document.getElementById('model');
            if (modelSection) {
                const modelTitle = modelSection.querySelector('h2');
                const rotateButton = document.getElementById('rotate-toggle');
                const wireframeButton = document.getElementById('wireframe-toggle');
                const colorLabel = document.querySelector('.color-controls label');
                
                if (modelTitle) modelTitle.textContent = translations[language].modelTitle;
                if (rotateButton) {
                    const icon = rotateButton.querySelector('i');
                    rotateButton.innerHTML = '';
                    rotateButton.appendChild(icon);
                    rotateButton.appendChild(document.createTextNode(' ' + translations[language].rotateButton));
                }
                if (wireframeButton) {
                    const icon = wireframeButton.querySelector('i');
                    wireframeButton.innerHTML = '';
                    wireframeButton.appendChild(icon);
                    wireframeButton.appendChild(document.createTextNode(' ' + translations[language].wireframeButton));
                }
                if (colorLabel) colorLabel.textContent = translations[language].colorLabel;
            }
            
            // История
            const historySection = document.getElementById('history');
            if (historySection) {
                const historyTitle = historySection.querySelector('h2');
                const subheadings = historySection.querySelectorAll('.history-text h3');
                const paragraphs = historySection.querySelectorAll('.history-text p');
                const imageCaption = historySection.querySelector('.caption');
                
                if (historyTitle) historyTitle.textContent = translations[language].historyTitle;
                
                if (subheadings.length >= 3) {
                    subheadings[0].textContent = translations[language].historySubtitle1;
                    subheadings[1].textContent = translations[language].historySubtitle2;
                    subheadings[2].textContent = translations[language].historySubtitle3;
                }
                
                if (paragraphs.length >= 3) {
                    paragraphs[0].textContent = translations[language].historyText1;
                    paragraphs[1].textContent = translations[language].historyText2;
                    paragraphs[2].textContent = translations[language].historyText3;
                }
                
                if (imageCaption) {
                    imageCaption.textContent = language === 'ru' ? 
                        translations[language].imageCaption :
                        translations[language].imageCaption;
                }
            }
            
            // Калькулятор
            const calculatorSection = document.getElementById('calculator');
            if (calculatorSection) {
                const calculatorTitle = calculatorSection.querySelector('h2');
                const parametersText = calculatorSection.querySelector('.parameter-selection p');
                const labels = calculatorSection.querySelectorAll('.parameter-label');
                const calculateButton = document.getElementById('calculate-btn');
                const resultsTitle = calculatorSection.querySelector('.results-container h3');
                const resultTitles = calculatorSection.querySelectorAll('.result-card h4');
                
                if (calculatorTitle) calculatorTitle.textContent = translations[language].calculatorTitle;
                if (parametersText) parametersText.textContent = translations[language].parametersTitle;
                
                if (labels.length >= 5) {
                    // Получаем тексты без чекбоксов
                    const edgeLabel = labels[0].childNodes[1].textContent.trim();
                    labels[0].childNodes[1].textContent = ' ' + translations[language].edgeLabel;
                    
                    const volumeLabel = labels[1].childNodes[1].textContent.trim();
                    labels[1].childNodes[1].textContent = ' ' + translations[language].volumeLabel;
                    
                    const surfaceLabel = labels[2].childNodes[1].textContent.trim();
                    labels[2].childNodes[1].textContent = ' ' + translations[language].surfaceLabel;
                    
                    const circumscribedLabel = labels[3].childNodes[1].textContent.trim();
                    labels[3].childNodes[1].textContent = ' ' + translations[language].circumscribedLabel;
                    
                    const inscribedLabel = labels[4].childNodes[1].textContent.trim();
                    labels[4].childNodes[1].textContent = ' ' + translations[language].inscribedLabel;
                }
                
                if (calculateButton) calculateButton.textContent = translations[language].calculateButton;
                if (resultsTitle) resultsTitle.textContent = translations[language].resultsTitle;
                
                if (resultTitles.length >= 5) {
                    resultTitles[0].textContent = translations[language].edgeResult;
                    resultTitles[1].textContent = translations[language].volumeResult;
                    resultTitles[2].textContent = translations[language].surfaceResult;
                    resultTitles[3].textContent = translations[language].circumscribedResult;
                    resultTitles[4].textContent = translations[language].inscribedResult;
                }
                
                // Обновляем сообщения калькулятора
                window.calculatorMessages = {
                    tooManyParams: translations[language].errorTooMany,
                    noParams: translations[language].errorNoParameters,
                    invalidParams: translations[language].errorInvalidValues,
                    incompatibleParams: translations[language].errorInconsistent,
                    success: translations[language].successMessage
                };
            }
            
            // Раздел с формулами
            const formulasSection = document.getElementById('formulas');
            if (formulasSection) {
                const formulasTitle = formulasSection.querySelector('h2');
                const categoryTitles = formulasSection.querySelectorAll('.formula-category h3');
                const formulaCards = formulasSection.querySelectorAll('.formula-card');
                
                if (formulasTitle) formulasTitle.textContent = translations[language].formulasTitle;
                
                if (categoryTitles.length >= 3) {
                    categoryTitles[0].textContent = translations[language].basicCharacteristics;
                    categoryTitles[1].textContent = translations[language].additionalCharacteristics;
                    categoryTitles[2].textContent = translations[language].derivedValues;
                }
                
                if (formulaCards.length >= 12) {
                    // Основные характеристики
                    formulaCards[0].querySelector('h4').textContent = translations[language].volumeFormula;
                    formulaCards[0].querySelector('.formula-description').textContent = translations[language].whereEdge;
                    
                    formulaCards[1].querySelector('h4').textContent = translations[language].surfaceAreaFormula;
                    formulaCards[1].querySelector('.formula-description').textContent = translations[language].whereEdge;
                    
                    formulaCards[2].querySelector('h4').textContent = translations[language].inscribedRadiusFormula;
                    formulaCards[2].querySelector('.formula-description').textContent = translations[language].whereEdge;
                    
                    formulaCards[3].querySelector('h4').textContent = translations[language].circumscribedRadiusFormula;
                    formulaCards[3].querySelector('.formula-description').textContent = translations[language].whereEdge;
                    
                    // Дополнительные характеристики
                    formulaCards[4].querySelector('h4').textContent = translations[language].dihedralAngleFormula;
                    formulaCards[4].querySelector('.formula-description').textContent = translations[language].dihedralAngleDescription;
                    
                    formulaCards[5].querySelector('h4').textContent = translations[language].centerToFaceFormula;
                    formulaCards[5].querySelector('.formula-description').textContent = translations[language].whereEdge;
                    
                    formulaCards[6].querySelector('h4').textContent = translations[language].faceAreaFormula;
                    formulaCards[6].querySelector('.formula-description').textContent = translations[language].whereEdge;
                    
                    formulaCards[7].querySelector('h4').textContent = translations[language].faceDiagonalFormula;
                    formulaCards[7].querySelector('.formula-description').textContent = translations[language].whereEdge;
                    
                    // Производные величины
                    formulaCards[8].querySelector('h4').textContent = translations[language].edgeFromVolumeFormula;
                    formulaCards[8].querySelector('.formula-description').textContent = translations[language].whereVolume;
                    
                    formulaCards[9].querySelector('h4').textContent = translations[language].edgeFromSurfaceFormula;
                    formulaCards[9].querySelector('.formula-description').textContent = translations[language].whereSurface;
                    
                    formulaCards[10].querySelector('h4').textContent = translations[language].edgeFromCircumscribedFormula;
                    formulaCards[10].querySelector('.formula-description').textContent = translations[language].whereCircumscribed;
                    
                    formulaCards[11].querySelector('h4').textContent = translations[language].edgeFromInscribedFormula;
                    formulaCards[11].querySelector('.formula-description').textContent = translations[language].whereInscribed;
                }
                
                // После перевода формул запускаем рендеринг MathJax
                if (typeof MathJax !== 'undefined') {
                    MathJax.typeset();
                }
            }
        }
        
        // Раздел с мемами
        const memesSection = document.getElementById('memes');
        if (memesSection) {
            const memesTitle = memesSection.querySelector('h2');
            const memeCards = memesSection.querySelectorAll('.meme-card');
            
            if (memesTitle) memesTitle.textContent = translations[language].memesTitle;
            
            if (memeCards.length >= 8) {
                memeCards[0].querySelector('h3').textContent = translations[language].geometricHumor;
                memeCards[1].querySelector('h3').textContent = translations[language].alwaysOnTime;
                memeCards[2].querySelector('h3').textContent = translations[language].inTheBar;
                memeCards[3].querySelector('h3').textContent = translations[language].gameEnthusiast;
                memeCards[4].querySelector('h3').textContent = translations[language].inTheGym;
                memeCards[5].querySelector('h3').textContent = translations[language].inTheCafe;
                memeCards[6].querySelector('h3').textContent = translations[language].interview;
                memeCards[7].querySelector('h3').textContent = translations[language].realCompliment;
                
                // Содержимое мемов остается на языке оригинала (не переводим шутки для сохранения юмора)
            }
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

// Инициализация после загрузки DOM
document.addEventListener('DOMContentLoaded', function() {
    // Инициализируем все компоненты
    initComponents();
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
    // Загружаем информацию о решенных задачах из localStorage
    loadSolvedProblems();
    
    // Добавляем обработчики для кнопок проверки ответов
    document.querySelectorAll('.check-btn').forEach((button, index) => {
        button.addEventListener('click', () => {
            checkAnswer(index + 1, button.closest('.problem-solution'));
        });
        
        // Отмечаем визуально уже решенные задачи
        const problemCard = button.closest('.problem-card');
        const problemNumber = index + 1;
        if (solvedProblems[problemNumber]) {
            const feedback = problemCard.querySelector('.solution-feedback');
            let correctAnswerMessage = 'Правильно! Отличная работа.';
            if (window.problemMessages) {
                correctAnswerMessage = window.problemMessages.correctAnswer;
            }
            feedback.textContent = correctAnswerMessage;
            feedback.className = 'solution-feedback correct';
        }
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
    
    // Добавляем обработчик для кнопки закрытия модального окна достижения
    const achievementCloseBtn = document.getElementById('achievement-close');
    if (achievementCloseBtn) {
        achievementCloseBtn.addEventListener('click', () => {
            document.getElementById('achievement-modal').classList.remove('show');
        });
    }
    
    // Проверяем, решены ли все задачи при загрузке страницы
    checkMastery();
}

/**
 * Загружает информацию о решенных задачах из localStorage
 */
function loadSolvedProblems() {
    // Проверяем наличие сохраненных данных для каждой задачи
    for (let i = 1; i <= Object.keys(solvedProblems).length; i++) {
        const isSolved = localStorage.getItem(`problem_${i}_solved`) === 'true';
        solvedProblems[i] = isSolved;
    }
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
        
        // Отмечаем задачу как решенную
        solvedProblems[problemNumber] = true;
        
        // Сохраняем информацию о решенной задаче в localStorage
        localStorage.setItem(`problem_${problemNumber}_solved`, 'true');
        
        // Проверяем, решены ли все задачи
        checkMastery();
    } else {
        feedback.textContent = incorrectAnswerMessage;
        feedback.className = 'solution-feedback incorrect';
    }
}

/**
 * Проверяет, решены ли все задачи, и показывает модальное окно достижения, если да
 */
function checkMastery() {
    // Проверяем, все ли задачи решены
    const allSolved = Object.values(solvedProblems).every(solved => solved === true);
    
    // Проверяем, показывалось ли уже достижение
    const achievementShown = localStorage.getItem('dodecahedronMaster') === 'true';
    
    // Если все задачи решены и достижение еще не показывалось
    if (allSolved && !achievementShown) {
        // Показываем модальное окно достижения
        showAchievementModal();
        
        // Сохраняем информацию о достижении в localStorage
        localStorage.setItem('dodecahedronMaster', 'true');
    }
}

/**
 * Показывает модальное окно достижения
 */
function showAchievementModal() {
    const modal = document.getElementById('achievement-modal');
    if (modal) {
        modal.classList.add('show');
        
        // Добавляем обработчик для кнопки закрытия
        const closeButton = document.getElementById('achievement-close');
        if (closeButton) {
            closeButton.addEventListener('click', () => {
                modal.classList.remove('show');
            });
        }
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

// Функция для инициализации всех компонентов на странице
function initComponents() {
    initSplashScreen();
    
    // Инициализируем хедер, скрывающийся при скролле
    initScrollHeader();
    
    // Инициализируем плавную прокрутку для якорных ссылок
    initSmoothScroll();
    
    // Инициализируем MathJax для формул (если доступен)
    if (typeof MathJax !== 'undefined') {
        MathJax.typeset();
    }
    
    // Инициализируем переключение темы
    initThemeToggle();
    
    // Инициализируем переключение языка
    initLanguageToggle();
    
    // Если мы находимся на главной странице (проверяем наличие 3D модели)
    if (document.getElementById('dodecahedron-model')) {
        initThreeJS();
        initModelControls();
        initCalculator();
    }
    
    // Если мы находимся на странице задач (проверяем наличие списка задач)
    if (document.querySelector('.problems-list')) {
        initProblemPage();
    }
}

/**
 * Инициализирует сплеш-экран
 */
function initSplashScreen() {
    const splashScreen = document.querySelector('.splash-screen');
    if (!splashScreen) return;
    
    // Показываем сплеш-экран на короткое время
    splashScreen.style.display = 'flex';
    
    // Через 1.5 сек скрываем сплеш-экран
    setTimeout(() => {
        splashScreen.classList.add('fade-out');
        
        // Полностью удаляем сплеш-экран через 500мс после начала анимации
        setTimeout(() => {
            splashScreen.style.display = 'none';
        }, 500);
    }, 1500);
}

/**
 * Инициализирует скрытие хедера при скролле
 */
function initScrollHeader() {
    let lastScrollTop = 0;
    const header = document.querySelector('header');
    if (!header) return;
    
    window.addEventListener('scroll', () => {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Если скролл больше 100px, добавляем класс для тени
        if (scrollTop > 100) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        
        // Скрываем хедер при скролле вниз и показываем при скролле вверх
        if (scrollTop > lastScrollTop && scrollTop > 200) {
            header.classList.add('header-hidden');
        } else {
            header.classList.remove('header-hidden');
        }
        
        lastScrollTop = scrollTop;
    });
}

/**
 * Инициализирует плавную прокрутку для якорных ссылок
 */
function initSmoothScroll() {
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
}

/**
 * Инициализирует 3D модель додекаэдра с помощью Three.js
 */
function initThreeJS() {
    // Настройка сцены, камеры и рендерера
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    
    // Создаём рендерер с прозрачным фоном
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    
    // Настраиваем размер рендерера и добавляем его в DOM
    const container = document.getElementById('dodecahedron-model');
    if (!container) return;
    
    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight || containerWidth;
    
    renderer.setSize(containerWidth, containerHeight);
    container.appendChild(renderer.domElement);
    
    // Добавляем OrbitControls для интерактивности
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    
    // Создаем додекаэдр
    const geometry = new THREE.DodecahedronGeometry(1, 0);
    const material = new THREE.MeshStandardMaterial({
        color: 0x3498db,
        roughness: 0.6,
        metalness: 0.3,
        flatShading: true
    });
    
    // Создаем каркас для додекаэдра
    const wireframeGeometry = new THREE.WireframeGeometry(geometry);
    const wireframeMaterial = new THREE.LineBasicMaterial({
        color: 0xffffff,
        linewidth: 1
    });
    const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
    
    // Создаем основной меш и добавляем каркас как дочерний объект
    dodecahedron = new THREE.Mesh(geometry, material);
    dodecahedron.add(wireframe);
    
    // По умолчанию каркас скрыт
    wireframe.visible = isWireframe;
    
    // Добавляем додекаэдр на сцену
    scene.add(dodecahedron);
    
    // Добавляем освещение
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);
    
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight1.position.set(1, 1, 1);
    scene.add(directionalLight1);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.6);
    directionalLight2.position.set(-1, -1, -1);
    scene.add(directionalLight2);
    
    // Устанавливаем позицию камеры и целевую точку просмотра
    camera.position.z = 3;
    
    // Настройка адаптивного размера модели
    function onWindowResize() {
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight || containerWidth;
        
        camera.aspect = containerWidth / containerHeight;
        camera.updateProjectionMatrix();
        
        renderer.setSize(containerWidth, containerHeight);
    }
    
    window.addEventListener('resize', onWindowResize);
    
    // Функция анимации
    function animate() {
        requestAnimationFrame(animate);
        
        // Вращаем додекаэдр, если активировано вращение
        if (isRotating) {
            dodecahedron.rotation.x += 0.005;
            dodecahedron.rotation.y += 0.007;
        }
        
        // Обновляем OrbitControls
        controls.update();
        
        // Рендерим сцену
        renderer.render(scene, camera);
    }
    
    // Запускаем анимацию
    animate();
}

/**
 * Инициализирует элементы управления 3D моделью
 */
function initModelControls() {
    // Добавляем обработчики для кнопок управления моделью
    const rotateButton = document.getElementById('rotate-toggle');
    const wireframeButton = document.getElementById('wireframe-toggle');
    const colorInput = document.getElementById('model-color');
    
    if (rotateButton) {
        rotateButton.addEventListener('click', toggleRotation);
        // Устанавливаем начальное состояние кнопки вращения
        if (isRotating) {
            rotateButton.classList.add('active');
        }
    }
    
    if (wireframeButton) {
        wireframeButton.addEventListener('click', toggleWireframe);
    }
    
    if (colorInput) {
        colorInput.addEventListener('input', changeModelColor);
    }
}

/**
 * Инициализирует калькулятор свойств додекаэдра
 */
function initCalculator() {
    const calculateButton = document.getElementById('calculate-btn');
    if (calculateButton) {
        calculateButton.addEventListener('click', calculateProperties);
    }
    
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