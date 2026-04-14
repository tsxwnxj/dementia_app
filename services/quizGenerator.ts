export interface Quiz {
  id: number;
  question: string;
  options: string[];
  answer: string;
}

function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function makeNumericOptions(correct: number, spread: number[] = [1, 2, 3]): string[] {
  const offsets = shuffle(spread);
  const wrongs: number[] = [];
  for (const offset of offsets) {
    const candidate = Math.random() < 0.5 ? correct + offset : correct - offset;
    if (candidate !== correct && candidate >= 0 && !wrongs.includes(candidate)) {
      wrongs.push(candidate);
    } else {
      wrongs.push(correct + offset + 1);
    }
  }
  return shuffle([correct, ...wrongs.slice(0, 3)].map(String));
}

export function generateQuizData(count: number = 300): Quiz[] {
  const quizzes: Quiz[] = [];

  const fruits = ["사과", "바나나", "포도", "오렌지", "딸기", "수박"];
  const vegetables = ["당근", "감자", "양파", "오이", "시금치", "브로콜리"];
  const animals = ["고양이", "강아지", "토끼", "햄스터"];
  const vehicles = ["자동차", "버스", "기차", "비행기"];

  interface TriviaTemplate {
    question: string;
    makeOptions: () => { options: string[]; answer: string };
  }

  const triviaPool: TriviaTemplate[] = [
    {
      question: "다음 중 채소는 무엇일까요?",
      makeOptions: () => {
        const correct = getRandom(vegetables);
        const wrongs = shuffle(fruits).slice(0, 3);
        return { options: shuffle([correct, ...wrongs]), answer: correct };
      },
    },
    {
      question: "다음 중 과일은 무엇일까요?",
      makeOptions: () => {
        const correct = getRandom(fruits);
        const wrongs = shuffle(vegetables).slice(0, 3);
        return { options: shuffle([correct, ...wrongs]), answer: correct };
      },
    },
    {
      question: "다음 중 동물은 무엇일까요?",
      makeOptions: () => {
        const correct = getRandom(animals);
        const wrongs = shuffle(vehicles).slice(0, 3);
        return { options: shuffle([correct, ...wrongs]), answer: correct };
      },
    },
    {
      question: "다음 중 교통수단은 무엇일까요?",
      makeOptions: () => {
        const correct = getRandom(vehicles);
        const wrongs = shuffle(animals).slice(0, 3);
        return { options: shuffle([correct, ...wrongs]), answer: correct };
      },
    },
  ];

  const wordPool = ["BANANA", "APPLE", "KOREA", "MISSISSIPPI", "TOMATO", "LETTER"];

  for (let i = 0; i < count; i++) {
    const type = i % 5;
    let quiz: Quiz;

    // 덧셈
    if (type === 0) {
      const a = Math.floor(Math.random() * 50) + 10;
      const b = Math.floor(Math.random() * 20) + 1;
      const correct = a + b;
      quiz = {
        id: i,
        question: `${a} + ${b} = ?`,
        options: makeNumericOptions(correct),
        answer: String(correct),
      };
    }
    // 뺄셈
    else if (type === 1) {
      const a = Math.floor(Math.random() * 100) + 20;
      const b = Math.floor(Math.random() * 30) + 1;
      const correct = a - b;
      quiz = {
        id: i,
        question: `${a} - ${b} = ?`,
        options: makeNumericOptions(correct),
        answer: String(correct),
      };
    }
    // 곱셈
    else if (type === 2) {
      const a = Math.floor(Math.random() * 9) + 2;
      const b = Math.floor(Math.random() * 9) + 2;
      const correct = a * b;
      quiz = {
        id: i,
        question: `${a} × ${b} = ?`,
        options: makeNumericOptions(correct, [2, 3, 5]),
        answer: String(correct),
      };
    }
    // 관찰력
    else if (type === 3) {
      const word = getRandom(wordPool);
      const char = word[Math.floor(Math.random() * word.length)];
      const countChar = (word.match(new RegExp(char, "g")) || []).length;
      const makeCountOption = (n: number) => `${Math.max(1, n)}개`;
      const options = shuffle([
        makeCountOption(countChar),
        makeCountOption(countChar + 1),
        makeCountOption(Math.max(1, countChar - 1)),
        makeCountOption(countChar + 2),
      ]);
      quiz = {
        id: i,
        question: `"${word}"에서 "${char}"는 몇 개일까요?`,
        options,
        answer: makeCountOption(countChar),
      };
    }
    // 상식
    else {
      const trivia = getRandom(triviaPool);
      const { options, answer } = trivia.makeOptions();
      quiz = {
        id: i,
        question: trivia.question,
        options,
        answer,
      };
    }

    quizzes.push(quiz);
  }

  return quizzes;
}