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
            geometricHumorContent: 'У додекаэдра 12 граней, но ни одной для селфи.',
            alwaysOnTime: 'Всегда вовремя',
            alwaysOnTimeContent: 'Почему додекаэдр никогда не опаздывает? Потому что у него всегда 20 точек сбора!',
            inTheBar: 'В баре',
            inTheBarContent: 'Додекаэдр заходит в бар. Бармен: "Извините, мы не обслуживаем платоновы тела". Додекаэдр: "Это дискриминация! У меня просто много граней!"',
            gameEnthusiast: 'Игровой энтузиаст',
            gameEnthusiastContent: 'Какая любимая игра у додекаэдра? 12-сторонние шахматы.',
            inTheGym: 'В спортзале',
            inTheGymContent: 'Додекаэдр в спортзале: "Хочу убрать лишние грани, но тренер говорит, что я и так идеален!"',
            inTheCafe: 'В кафе',
            inTheCafeContent: 'Тетраэдр, куб и додекаэдр сидят в кафе. Тетраэдр говорит: "Мне так сложно находить общий язык с другими фигурами, я такой угловатый". Куб отвечает: "Ты просто мыслишь слишком квадратно". Додекаэдр: "Ребята, у меня на эту тему есть 12 разных точек зрения".',
            interview: 'Интервью',
            interviewContent: 'Додекаэдр пришел на собеседование. HR-менеджер: "Расскажите о ваших сильных сторонах". Додекаэдр: "У меня их ровно 30!"',
            realCompliment: 'Настоящий комплимент',
            realComplimentContent: 'Что сказал один додекаэдр другому? "Ты выглядишь сегодня многогранно!"',
            atMathConference: 'На математической конференции',
            atMathConferenceContent: 'Додекаэдр выступает на математической конференции: "Я не хочу казаться самонадеянным, но у других фигур просто не хватает граней, чтобы понять мою теорию".',
            
            // Тексты задач
            problem1Text: 'Найдите объем додекаэдра, если длина его ребра равна 5 см.',
            problem1Hint: 'Подсказка: Используйте формулу \\(V = \\frac{15 + 7\\sqrt{5}}{4} \\times a^3\\), где \\(a\\) - длина ребра.',
            
            problem2Text: 'Найдите площадь поверхности додекаэдра с ребром длиной 3 см.',
            problem2Hint: 'Подсказка: Используйте формулу \\(S = 3\\sqrt{25 + 10\\sqrt{5}} \\times a^2\\), где \\(a\\) - длина ребра.',
            
            problem3Text: 'Найдите радиус вписанной сферы додекаэдра с ребром 4 см.',
            problem3Hint: 'Подсказка: Радиус вписанной сферы \\(r = a \\times \\frac{\\sqrt{75 + 30\\sqrt{5}}}{20}\\), где \\(a\\) - длина ребра.',
            
            problem4Text: 'Для додекаэдра с радиусом описанной сферы 10 см найдите длину его ребра.',
            problem4Hint: 'Подсказка: Радиус описанной сферы \\(R = a\\sqrt{3} \\times \\frac{1 + \\sqrt{5}}{4}\\), где \\(a\\) - длина ребра. Выразите \\(a\\) из этой формулы.',
            
            problem5Text: 'Вычислите двугранный угол додекаэдра (угол между соседними гранями).',
            problem5Hint: 'Подсказка: Двугранный угол додекаэдра не зависит от размера и равен \\(\\cot^{-1}(-\\frac{1}{\\sqrt{5}})\\).',
            
            problem6Text: 'Додекаэдр вписан в куб так, что каждая вершина додекаэдра лежит на одной из граней куба. Если объем куба равен 1000 см³, найдите объем додекаэдра.',
            problem6Hint: 'Подсказка: Это сложная геометрическая задача. Вам нужно найти отношение объемов додекаэдра и куба в такой конфигурации.'
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
            geometricHumorContent: 'A dodecahedron has 12 faces, but none suitable for a selfie.',
            alwaysOnTime: 'Always on Time',
            alwaysOnTimeContent: 'Why is a dodecahedron never late? Because it always has 20 points on time!',
            inTheBar: 'In the Bar',
            inTheBarContent: 'A dodecahedron walks into a bar. Bartender: "Sorry, we don\'t serve platonic solids here." Dodecahedron: "That\'s discrimination! I have too many faces!"',
            gameEnthusiast: 'Game Enthusiast',
            gameEnthusiastContent: 'What\'s a dodecahedron\'s favorite game? 12-sided chess.',
            inTheGym: 'In the Gym',
            inTheGymContent: 'Dodecahedron at the gym: "I want to lose some extra faces, but my trainer says I\'m already perfect!"',
            inTheCafe: 'In the Cafe',
            inTheCafeContent: 'A tetrahedron, cube, and dodecahedron sit in a cafe. The tetrahedron says: "It\'s so hard for me to connect with other shapes, I\'m too pointy." The cube replies: "You\'re just thinking too square." Dodecahedron: "Guys, I have 12 different perspectives on this topic."',
            interview: 'Interview',
            interviewContent: 'A dodecahedron came to a job interview. HR manager: "Tell me about your strengths." Dodecahedron: "I have exactly 30 of them!"',
            realCompliment: 'Real Compliment',
            realComplimentContent: 'What did one dodecahedron say to another? "You look quite multifaceted today!"',
            atMathConference: 'At a Math Conference',
            atMathConferenceContent: 'A dodecahedron speaks at a math conference: "I don\'t want to sound presumptuous, but other shapes simply don\'t have enough faces to understand my theory."',
            
            // Problem texts
            problem1Text: 'Find the volume of a dodecahedron if its edge length is 5 cm.',
            problem1Hint: 'Hint: Use the formula \\(V = \\frac{15 + 7\\sqrt{5}}{4} \\times a^3\\), where \\(a\\) is the edge length.',
            
            problem2Text: 'Find the surface area of a dodecahedron with an edge length of 3 cm.',
            problem2Hint: 'Hint: Use the formula \\(S = 3\\sqrt{25 + 10\\sqrt{5}} \\times a^2\\), where \\(a\\) is the edge length.',
            
            problem3Text: 'Find the radius of the inscribed sphere of a dodecahedron with an edge length of 4 cm.',
            problem3Hint: 'Hint: The radius of the inscribed sphere is \\(r = a \\times \\frac{\\sqrt{75 + 30\\sqrt{5}}}{20}\\), where \\(a\\) is the edge length.',
            
            problem4Text: 'For a dodecahedron with a circumscribed sphere radius of 10 cm, find the length of its edge.',
            problem4Hint: 'Hint: The radius of the circumscribed sphere is \\(R = a\\sqrt{3} \\times \\frac{1 + \\sqrt{5}}{4}\\), where \\(a\\) is the edge length. Express \\(a\\) from this formula.',
            
            problem5Text: 'Calculate the dihedral angle of a dodecahedron (the angle between adjacent faces).',
            problem5Hint: 'Hint: The dihedral angle of a dodecahedron is independent of its size and equals \\(\\cot^{-1}(-\\frac{1}{\\sqrt{5}})\\).',
            
            problem6Text: 'A dodecahedron is inscribed in a cube such that each vertex of the dodecahedron lies on one of the faces of the cube. If the volume of the cube is 1000 cm³, find the volume of the dodecahedron.',
            problem6Hint: 'Hint: This is a complex geometric problem. You need to find the ratio of the volumes of the dodecahedron and the cube in this configuration.'
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
        
        // Обновляем логотип
        const logoText = document.querySelector('.logo span');
        if (logoText) {
            logoText.textContent = translations[language].logoText;
        }
        
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
            
            if (memeCards.length >= 9) {
                memeCards[0].querySelector('h3').textContent = translations[language].geometricHumor;
                memeCards[1].querySelector('h3').textContent = translations[language].alwaysOnTime;
                memeCards[2].querySelector('h3').textContent = translations[language].inTheBar;
                memeCards[3].querySelector('h3').textContent = translations[language].gameEnthusiast;
                memeCards[4].querySelector('h3').textContent = translations[language].inTheGym;
                memeCards[5].querySelector('h3').textContent = translations[language].inTheCafe;
                memeCards[6].querySelector('h3').textContent = translations[language].interview;
                memeCards[7].querySelector('h3').textContent = translations[language].realCompliment;
                memeCards[8].querySelector('h3').textContent = translations[language].atMathConference;
                
                // Перевод содержимого мемов для обоих языков
                memeCards[0].querySelector('p').textContent = translations[language].geometricHumorContent;
                memeCards[1].querySelector('p').textContent = translations[language].alwaysOnTimeContent;
                memeCards[2].querySelector('p').textContent = translations[language].inTheBarContent;
                memeCards[3].querySelector('p').textContent = translations[language].gameEnthusiastContent;
                memeCards[4].querySelector('p').textContent = translations[language].inTheGymContent;
                memeCards[5].querySelector('p').textContent = translations[language].inTheCafeContent;
                memeCards[6].querySelector('p').textContent = translations[language].interviewContent;
                memeCards[7].querySelector('p').textContent = translations[language].realComplimentContent;
                memeCards[8].querySelector('p').textContent = translations[language].atMathConferenceContent;
            }
        }

        // Футер
        const footer = document.querySelector('footer');
        if (footer) {
            const footerSections = footer.querySelectorAll('.footer-section h3');
            const aboutText = footer.querySelector('.footer-section p');
            const resourceLinks = footer.querySelectorAll('.footer-section:last-child a');
            
            if (footerSections.length >= 3) {
                footerSections[0].textContent = translations[language].aboutProject;
                footerSections[1].textContent = translations[language].navigationTitle;
                footerSections[2].textContent = translations[language].resourcesTitle;
            }
            
            if (aboutText) {
                aboutText.textContent = translations[language].aboutText;
            }
            
            if (resourceLinks.length >= 2) {
                resourceLinks[0].textContent = translations[language].wikipediaLink;
                resourceLinks[1].textContent = translations[language].mathworldLink;
            }
        }

        // Страница задач (problems.html)
        const problemsHeader = document.querySelector('.problems-header');
        if (problemsHeader) {
            const title = problemsHeader.querySelector('h2');
            const subtitle = problemsHeader.querySelector('p');
            
            if (title) title.textContent = translations[language].problemsTitle;
            if (subtitle) subtitle.textContent = translations[language].problemsSubtitle;
            
            // Переводим фильтры сложности
            const difficultyFilters = document.querySelectorAll('.difficulty-btn');
            if (difficultyFilters.length >= 4) {
                difficultyFilters[0].textContent = translations[language].difficultyAll;
                difficultyFilters[1].textContent = translations[language].difficultyEasy;
                difficultyFilters[2].textContent = translations[language].difficultyMedium;
                difficultyFilters[3].textContent = translations[language].difficultyHard;
            }
            
            // Переводим карточки задач
            const problemCards = document.querySelectorAll('.problem-card');
            problemCards.forEach((card, index) => {
                const problemNumber = card.querySelector('.problem-number');
                const difficultyLabel = card.querySelector('.difficulty');
                const hintButton = card.querySelector('.hint-btn');
                const checkButton = card.querySelector('.check-btn');
                const input = card.querySelector('input');
                
                if (problemNumber) {
                    problemNumber.textContent = `${translations[language].problemPrefix} ${index + 1}`;
                }
                
                if (difficultyLabel) {
                    const difficulty = difficultyLabel.classList.contains('easy') ? translations[language].difficultyEasy :
                                      difficultyLabel.classList.contains('medium') ? translations[language].difficultyMedium :
                                      translations[language].difficultyHard;
                    difficultyLabel.textContent = difficulty;
                }
                
                // Получаем текст задачи и подсказки
                const problemText = card.querySelector('.problem-content > p');
                const hintText = card.querySelector('.problem-hint p');
                
                // Переводим текст задачи и подсказки
                if (problemText) {
                    const problemKey = `problem${index + 1}Text`;
                    if (translations[language][problemKey]) {
                        problemText.textContent = translations[language][problemKey];
                    }
                }
                
                if (hintText) {
                    const hintKey = `problem${index + 1}Hint`;
                    if (translations[language][hintKey]) {
                        hintText.innerHTML = translations[language][hintKey];
                    }
                }
            });
        }
    }
    
    translatePage(language);
}