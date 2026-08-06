export interface Exercise {
  name: string;
  badge: string;
  img: string;
  desc: string;
  key: string;
  hasWeight?: boolean;
}

export interface WorkoutBlock {
  title: string;
  icon: string;
  accent: string;
  desc: string;
  exercises: Exercise[];
}

export const WORKOUT: WorkoutBlock[] = [
  {
    title: 'Силовий блок',
    icon: '🏋️',
    accent: 'block-0',
    desc: "Великі м'язи → Малі м'язи. Відпочинок 60–90 сек між підходами.",
    exercises: [
      {
        name: 'Жим ногами в тренажері',
        badge: '3×15',
        img: 'images/leg-press.svg',
        desc: 'Ноги на ширині плечей. Плавно опускай платформу до кута 90° в колінах. Витискай без блокування колін.',
        key: 'leg-press',
        hasWeight: true,
      },
      {
        name: 'Згинання/розгинання ніг',
        badge: '3×15',
        img: 'images/leg-curl.svg',
        desc: 'Поперемінно: згинання для біцепсу стегна, розгинання для квадрицепсу. Контролюй рух в обох фазах.',
        key: 'leg-curl',
        hasWeight: true,
      },
      {
        name: 'Тяга верхнього блоку до грудей',
        badge: '3×15',
        img: 'images/lat-pulldown.svg',
        desc: 'Хват широкий. Зводь лопатки в нижній точці. Корпус трохи відхилений назад.',
        key: 'lat-pulldown',
        hasWeight: true,
      },
      {
        name: 'Жим сидячи на груди',
        badge: '3×15',
        img: 'images/chest-press.svg',
        desc: 'Лікті під кутом 45° до корпусу. Витискай на видиху, опускай контрольовано.',
        key: 'chest-press',
        hasWeight: true,
      },
      {
        name: 'Згинання на біцепс',
        badge: '3×12–15',
        img: 'images/biceps-curl.svg',
        desc: 'Лікті нерухомо притиснуті. Пік скорочення у верхній точці. Опускай повільно.',
        key: 'biceps-curl',
        hasWeight: true,
      },
      {
        name: 'Розгинання на трицепс',
        badge: '3×12–15',
        img: 'images/triceps-pushdown.svg',
        desc: 'За бажанням. Трос/канат. Лікті фіксовані, тільки передпліччя рухаються.',
        key: 'triceps-pushdown',
        hasWeight: true,
      },
    ],
  },
  {
    title: 'Інтенсивний фінішер',
    icon: '🔥',
    accent: 'block-1',
    desc: 'Місток між силовим блоком і кардіо. Максимально розганяє метаболізм.',
    exercises: [
      {
        name: 'Бурпі',
        badge: '3–4×10',
        img: 'images/burpee.svg',
        desc: 'Відпочинок 45–60 сек між підходами. З упором лежачи, стрибок угору з бавовною.',
        key: 'burpee',
      },
    ],
  },
  {
    title: 'Блок для кору',
    icon: '💪',
    accent: 'block-2',
    desc: "Зміцнення м'язів живота та спини.",
    exercises: [
      {
        name: 'Прес (скручування)',
        badge: '3×20',
        img: 'images/crunch.svg',
        desc: 'На килимку або в тренажері. Скручуй корпус, поперек притиснута до підлоги.',
        key: 'crunch',
      },
      {
        name: 'Планка',
        badge: '3×45–60c',
        img: 'images/plank.svg',
        desc: 'Тіло — пряма лінія. Не прогинай поперек. Тримай прес і сідниці напруженими.',
        key: 'plank',
      },
    ],
  },
  {
    title: 'Кардіо (Заминка)',
    icon: '🏃',
    accent: 'block-3',
    desc: 'Жироспалювальна зона пульсу ~110–130 уд/хв.',
    exercises: [
      {
        name: 'Ходьба з нахилом',
        badge: '20–30хв',
        img: 'images/treadmill.svg',
        desc: 'Швидкість 5–5.5 км/год, нахил 10–12%. Тривалість 20–30 хвилин. Пульс у жироспалювальній зоні.',
        key: 'treadmill',
      },
    ],
  },
];

export function getAllKeys(): string[] {
  const keys: string[] = [];
  for (const block of WORKOUT) {
    for (const ex of block.exercises) {
      keys.push(ex.key);
    }
  }
  return keys;
}
