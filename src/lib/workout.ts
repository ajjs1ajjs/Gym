export interface Exercise {
  name: string;
  badge: string;
  img: string;
  desc: string;
  key: string;
  hasWeight?: boolean;
  /** Відпочинок між підходами, сек. Відсутній — таймер не показується (напр. кардіо). */
  rest?: number;
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
        rest: 90,
      },
      {
        name: 'Присідання з гантеллю',
        badge: '3×12',
        img: 'images/goblet-squat.svg',
        desc: 'Гантель біля грудей. Сідай до паралелі стегон, коліна не завалюй всередину. Контрольовано вгору.',
        key: 'goblet-squat',
        hasWeight: true,
        rest: 90,
      },
      {
        name: 'Згинання/розгинання ніг',
        badge: '3×15',
        img: 'images/leg-curl.svg',
        desc: 'Поперемінно: згинання для біцепсу стегна, розгинання для квадрицепсу. Контролюй рух в обох фазах.',
        key: 'leg-curl',
        hasWeight: true,
        rest: 90,
      },
      {
        name: 'Тяга верхнього блоку до грудей',
        badge: '3×15',
        img: 'images/lat-pulldown.svg',
        desc: 'Хват широкий. Зводь лопатки в нижній точці. Корпус трохи відхилений назад.',
        key: 'lat-pulldown',
        hasWeight: true,
        rest: 90,
      },
      {
        name: 'Тяга нижнього блоку до пояса',
        badge: '3×15',
        img: 'images/seated-row.svg',
        desc: 'Корпус нерухомий, тягни рукоятку до пояса. Зводь лопатки, лікті близько до корпусу.',
        key: 'seated-row',
        hasWeight: true,
        rest: 90,
      },
      {
        name: 'Жим сидячи на груди',
        badge: '3×15',
        img: 'images/chest-press.svg',
        desc: 'Лікті під кутом 45° до корпусу. Витискай на видиху, опускай контрольовано.',
        key: 'chest-press',
        hasWeight: true,
        rest: 90,
      },
      {
        name: 'Розведення рук у тренажері',
        badge: '3×15',
        img: 'images/pec-deck.svg',
        desc: 'Передпліччя на подушках. Зводь руки на видиху, у крайній точці — коротка пауза.',
        key: 'pec-deck',
        hasWeight: true,
        rest: 90,
      },
      {
        name: 'Махи гантелями в сторони',
        badge: '3×12–15',
        img: 'images/lateral-raise.svg',
        desc: 'Лікті трохи зігнуті. Піднімай руки до рівня плечей, без розгойдування корпусом.',
        key: 'lateral-raise',
        hasWeight: true,
        rest: 90,
      },
      {
        name: 'Згинання на біцепс',
        badge: '3×12–15',
        img: 'images/biceps-curl.svg',
        desc: 'Лікті нерухомо притиснуті. Пік скорочення у верхній точці. Опускай повільно.',
        key: 'biceps-curl',
        hasWeight: true,
        rest: 90,
      },
      {
        name: 'Розгинання на трицепс',
        badge: '3×12–15',
        img: 'images/triceps-pushdown.svg',
        desc: 'За бажанням. Трос/канат. Лікті фіксовані, тільки передпліччя рухаються.',
        key: 'triceps-pushdown',
        hasWeight: true,
        rest: 90,
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
        rest: 60,
      },
      {
        name: 'Скакалка',
        badge: '3×60с',
        img: 'images/jump-rope.svg',
        desc: 'Рівномірний темп, стрибки низькі. Відпочинок 45 сек між підходами.',
        key: 'jump-rope',
        rest: 45,
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
        rest: 60,
      },
      {
        name: 'Підйом ніг у висі',
        badge: '3×12',
        img: 'images/leg-raise.svg',
        desc: 'Вис на перекладині. Піднімай прямі або зігнуті ноги до рівня таза, без розгойдування.',
        key: 'leg-raise',
        rest: 60,
      },
      {
        name: 'Російський твіст',
        badge: '3×20',
        img: 'images/russian-twist.svg',
        desc: 'Сидячи, корпус трохи назад. Обертай корпус із м’ячем або диском у сторони.',
        key: 'russian-twist',
        rest: 45,
      },
      {
        name: 'Планка',
        badge: '3×45–60c',
        img: 'images/plank.svg',
        desc: 'Тіло — пряма лінія. Не прогинай поперек. Тримай прес і сідниці напруженими.',
        key: 'plank',
        rest: 60,
      },
      {
        name: 'Гіперекстензія',
        badge: '3×15',
        img: 'images/back-extension.svg',
        desc: 'На лаві для гіперекстензій. Підйом до прямої лінії, без перерозгинання в попереку.',
        key: 'back-extension',
        rest: 60,
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
      {
        name: 'Велотренажер',
        badge: '15–20хв',
        img: 'images/bike.svg',
        desc: 'Рівний темп, середній опір. Тримай пульс у жироспалювальній зоні.',
        key: 'bike',
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

const EXERCISES_BY_KEY: ReadonlyMap<string, Exercise> = new Map(
  WORKOUT.flatMap((block) => block.exercises).map((ex) => [ex.key, ex]),
);

export function getExerciseByKey(key: string): Exercise | undefined {
  return EXERCISES_BY_KEY.get(key);
}
