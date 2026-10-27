function rand(n) {
  return Math.floor(Math.random() * n);
}

let stopGame = () => {};

function init(options) {
  stopGame();
  const game = document.getElementById('game');
  const dLeft = game.querySelector('.left');
  const correct = game.querySelector('.correct');
  const banner = game.querySelector('.banner');
  const start = banner.querySelector('.start');
  const feedback = banner.querySelector('.feedback');
  const problem = game.querySelector('.problem');
  const answer = game.querySelector('.answer');
  let revealTimeout = null;
  let finished = false;

  answer.focus();

  function randGen(min, max) {
    return function () {
      return Math.min(min, max) + rand(Math.abs(max - min) + 1);
    };
  }

  const genTypes = ['add_left', 'add_right', 'mul_left', 'mul_right'];
  const randGens = {};
  genTypes.forEach((type) => {
    randGens[type] = randGen(options[`${type}_min`], options[`${type}_max`]);
  });

  function pgAdd() {
    const left = randGens.add_left();
    const right = randGens.add_right();
    return { prettyProblem: `${left} + ${right}`, answer: left + right };
  }

  function pgSub() {
    const first = randGens.add_left();
    const second = randGens.add_right();
    return {
      prettyProblem: `${first + second} – ${first}`,
      answer: second,
    };
  }

  function pgMul() {
    const left = randGens.mul_left();
    const right = randGens.mul_right();
    return { prettyProblem: `${left} × ${right}`, answer: left * right };
  }

  function pgDiv() {
    const first = randGens.mul_left();
    const second = randGens.mul_right();
    if (first !== 0) {
      return {
        prettyProblem: `${first * second} ÷ ${first}`,
        answer: second,
      };
    }
  }

  const problemGenerators = [];
  if (options.add) problemGenerators.push(pgAdd);
  if (options.sub) problemGenerators.push(pgSub);
  if (options.mul) problemGenerators.push(pgMul);
  if (options.div) problemGenerators.push(pgDiv);
  if (!problemGenerators.length) problemGenerators.push(pgAdd);

  function problemGen() {
    let generated;
    while (generated == null) {
      generated = problemGenerators[rand(problemGenerators.length)]();
    }
    return generated;
  }

  let generated;
  let score = 0;

  function nextProblem() {
    generated = problemGen();
    problem.textContent = generated.prettyProblem;
    answer.value = '';
    feedback.textContent = '';
    feedback.style.display = 'none';
    start.style.display = '';
    answer.disabled = false;
    answer.focus();
  }

  nextProblem();
  const startTime = Date.now();
  const duration = options.duration || 120;
  dLeft.textContent = `Seconds left: ${duration}`;

  const onInput = () => {
    answer.value = answer.value.replace(/[^0-9]/g, '');
  };

  const submitAnswer = () => {
    if (finished || answer.disabled || answer.value === '') return;

    if (answer.value === String(generated.answer)) {
      nextProblem();
      correct.textContent = `Score: ${++score}`;
      return;
    }

    answer.disabled = true;
    start.style.display = 'none';
    feedback.textContent = `Wrong! The answer is ${generated.answer}.`;
    feedback.style.display = 'block';
    revealTimeout = setTimeout(() => {
      if (!finished) nextProblem();
    }, 3000);
  };

  const onKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      submitAnswer();
    }
  };

  answer.addEventListener('input', onInput);
  answer.addEventListener('keydown', onKeyDown);

  const timer = setInterval(() => {
    const secondsLeft = duration - Math.floor((Date.now() - startTime) / 1000);
    dLeft.textContent = `Seconds left: ${secondsLeft}`;
    if (secondsLeft <= 0) {
      finished = true;
      clearTimeout(revealTimeout);
      answer.disabled = true;
      clearInterval(timer);
      start.style.display = 'none';
      feedback.style.display = 'none';
      banner.querySelector('.end').style.display = 'block';
      banner.querySelector('.end .correct').textContent = `Score: ${score}`;
    }
  }, 1000);

  correct.textContent = 'Score: 0';
  stopGame = () => {
    clearInterval(timer);
    clearTimeout(revealTimeout);
    answer.removeEventListener('input', onInput);
    answer.removeEventListener('keydown', onKeyDown);
  };
}

function readOptions(form) {
  const get = (id) => Number.parseInt(document.getElementById(id).value, 10) || 0;
  return {
    duration: Number(form.duration.value),
    add: form.add.checked,
    sub: form.sub.checked,
    mul: form.mul.checked,
    div: form.div.checked,
    add_left_min: get('addMin'),
    add_left_max: get('addMax'),
    add_right_min: get('addMin2'),
    add_right_max: get('addMax2'),
    mul_left_min: get('mulMin'),
    mul_left_max: get('mulMax'),
    mul_right_min: get('mulMin2'),
    mul_right_max: get('mulMax2'),
  };
}

function readOptionsFromQuery(form) {
  const params = new URLSearchParams(window.location.search);
  if (params.get('game') !== '1') return null;

  const defaults = readOptions(form);
  const options = { ...defaults };
  ['add', 'sub', 'mul', 'div'].forEach((key) => {
    if (params.has(key)) options[key] = params.get(key) === '1';
  });
  Object.keys(options).forEach((key) => {
    if (['add', 'sub', 'mul', 'div'].includes(key) || !params.has(key)) return;
    const value = Number.parseInt(params.get(key), 10);
    if (Number.isFinite(value)) options[key] = value;
  });
  return options;
}

function applyOptionsToForm(form, options) {
  Object.entries(options).forEach(([key, value]) => {
    const field = form.elements.namedItem(key);
    if (!field) return;
    if (field.type === 'checkbox') field.checked = value;
    else field.value = value;
  });
}

function optionsToQuery(options) {
  const params = new URLSearchParams({ game: '1' });
  Object.entries(options).forEach(([key, value]) => {
    params.set(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
  });
  return params.toString();
}

const form = document.getElementById('settingsForm');
let gameOptions = readOptionsFromQuery(form);
if (gameOptions) {
  applyOptionsToForm(form, gameOptions);
  document.getElementById('welcome').hidden = true;
  document.getElementById('game').hidden = false;
  init(gameOptions);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  gameOptions = readOptions(form);
  window.location.search = `?${optionsToQuery(gameOptions)}`;
});

document.getElementById('tryAgain').addEventListener('click', (event) => {
  event.preventDefault();
  document.getElementById('game').hidden = false;
  document.getElementById('game').querySelector('.start').style.display = '';
  document.getElementById('game').querySelector('.end').style.display = 'none';
  document.getElementById('game').querySelector('.answer').disabled = false;
  init(gameOptions || readOptions(form));
});

document.getElementById('changeSettings').addEventListener('click', (event) => {
  event.preventDefault();
  stopGame();
  window.history.replaceState(null, '', `${window.location.pathname}${window.location.hash}`);
  document.getElementById('game').hidden = true;
  document.getElementById('welcome').hidden = false;
});
