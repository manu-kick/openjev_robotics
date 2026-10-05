const codecData = {
  bin256: { name: 'Per-axis binning · 256', success: 40, tokens: 224, error: 0.002, verdict: 'Every replay succeeds. No codec training required.', note: 'Seven tokens per step × 32 steps. Precise, predictable, but verbose.' },
  fast: { name: 'FAST · scale 10', success: 38, tokens: 50, error: 0.022, verdict: 'It passes the gate by compressing smooth trajectories with DCT and BPE.', note: 'Length depends on the motion. Lower scales cost less, but produce overshoot.' },
  oat: { name: 'OAT · learned tokens', success: 25, tokens: 16, error: 0.087, verdict: 'The most compact representation, but drift breaks fifteen trajectories.', note: '1,914 of 1,920 codes are used: vocabulary size is not the bottleneck.' },
  bin25: { name: 'Per-axis binning · 25', success: 39, tokens: 224, error: 0.020, verdict: 'One choice fits PlayJev’s alphabet and nearly every replay succeeds.', note: 'The policy compromise: 25 options per axis, seven questions per step.' }
};

const axes = [
  { id: 'dx', min: -1, max: 1, value: -.19 }, { id: 'dy', min: -1, max: 1, value: .28 },
  { id: 'dz', min: -1, max: 1, value: -.08 }, { id: 'dα', min: -.5, max: .5, value: .13 },
  { id: 'dβ', min: -.5, max: .5, value: -.11 }, { id: 'dγ', min: -.5, max: .5, value: .04 },
  { id: 'grip', min: -1, max: 1, value: 1, grip: true }
];

const actionControls = document.querySelector('#action-controls');
axes.forEach((axis, index) => {
  const wrap = document.createElement('div');
  wrap.className = 'axis-control';
  wrap.innerHTML = `<label for="axis-${index}"><span>${axis.id}</span><output>${axis.value.toFixed(axis.grip ? 0 : 2)}</output></label><input id="axis-${index}" type="range" min="${axis.min}" max="${axis.max}" step="${axis.grip ? 2 : .01}" value="${axis.value}" aria-label="Valore ${axis.id}">`;
  actionControls.appendChild(wrap);
  wrap.querySelector('input').addEventListener('input', updateAction);
});

function quantize(value, min, max) {
  const step = (max - min) / 24;
  return Math.round((value - min) / step) * step + min;
}

function updateAction() {
  const values = [...actionControls.querySelectorAll('input')].map(NumberInputValue);
  const quantized = values.map((v, i) => axes[i].grip ? (v >= 0 ? 1 : -1) : quantize(v, axes[i].min, axes[i].max));
  [...actionControls.querySelectorAll('.axis-control')].forEach((control, i) => control.querySelector('output').textContent = values[i].toFixed(axes[i].grip ? 0 : 2));
  document.querySelector('#raw-vector').textContent = formatVector(values);
  document.querySelector('#quant-vector').textContent = formatVector(quantized);
  const error = values.slice(0, 6).reduce((sum, v, i) => sum + Math.abs(v - quantized[i]), 0) / 6;
  document.querySelector('#quant-error').textContent = error.toFixed(3);
}

function NumberInputValue(input) { return Number(input.value); }
function formatVector(values) { return `[${values.map((v, i) => v.toFixed(axes[i].grip ? 0 : 2)).join(', ')}]`; }

document.querySelector('#random-action').addEventListener('click', () => {
  actionControls.querySelectorAll('input').forEach((input, i) => {
    const axis = axes[i];
    input.value = axis.grip ? (Math.random() > .5 ? 1 : -1) : axis.min + Math.random() * (axis.max - axis.min);
  });
  updateAction();
});
updateAction();

const prototypeSlider = document.querySelector('#prototype-frame');
let prototypeData = null;
function formatAction(values) {
  return `[${values.map((value, index) => Number(value).toFixed(index === 6 ? 0 : 2)).join(', ')}]`;
}
function updatePrototypeFrame() {
  if (!prototypeData) return;
  const index = Number(prototypeSlider.value);
  const frame = prototypeData.frames[index];
  document.querySelector('#prototype-frame-count').textContent = `frame ${index + 1} / ${prototypeData.frame_count}`;
  document.querySelectorAll('.prototype-frame-image').forEach(image => {
    image.src = `assets/codebook-comparison/${image.dataset.mode}/${String(index).padStart(4, '0')}.webp`;
  });
  document.querySelector('#expert-action').textContent = formatAction(frame.expert);
  document.querySelector('#k16-action').textContent = formatAction(frame.k16);
  document.querySelector('#k26-action').textContent = formatAction(frame.k26);
  document.querySelector('#k16-code').textContent = `PROTOTYPE ${frame.k16_code + 1} / 16`;
  document.querySelector('#k26-code').textContent = `PROTOTYPE ${frame.k26_code + 1} / 26`;
  document.querySelector('#prototype-gripper-state').textContent = frame.expert[6] >= 0 ? 'gripper closed' : 'gripper open';
}
prototypeSlider.addEventListener('input', updatePrototypeFrame);
fetch('assets/codebook-comparison/metadata.json').then(response => response.json()).then(data => {
  prototypeData = data;
  prototypeSlider.max = data.frame_count - 1;
  const denominator = Math.max(1, data.frame_count - 1);
  document.querySelector('#gripper-zones').innerHTML = data.expert_gripper_closed.map(range => {
    const left = range.start / denominator * 100;
    const width = Math.max(1, (range.end - range.start + 1) / denominator * 100);
    return `<button class="gripper-zone" type="button" style="left:${left}%;width:${width}%" aria-label="Expert gripper closed from frame ${range.start + 1} to ${range.end + 1}"><span class="gripper-popover">Expert closes the gripper<br>frames ${range.start + 1}–${range.end + 1}</span></button>`;
  }).join('');
  document.querySelectorAll('.gripper-zone').forEach((marker, index) => marker.addEventListener('click', () => {
    prototypeSlider.value = data.expert_gripper_closed[index].start;
    updatePrototypeFrame();
  }));
  updatePrototypeFrame();
}).catch(() => {
  document.querySelector('#prototype-frame-count').textContent = 'comparison unavailable';
});

document.querySelectorAll('.codec-tabs button').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.codec-tabs button').forEach(item => item.setAttribute('aria-selected', String(item === button)));
  const data = codecData[button.dataset.codec];
  document.querySelector('#codec-name').textContent = data.name;
  document.querySelector('#codec-success').innerHTML = `${data.success}<small>/40</small>`;
  document.querySelector('#codec-verdict').textContent = data.verdict;
  document.querySelector('#success-value').textContent = `${Math.round(data.success / 40 * 100)}%`;
  document.querySelector('#tokens-value').textContent = data.tokens;
  document.querySelector('#error-value').textContent = data.error.toFixed(3);
  document.querySelector('#codec-note').textContent = data.note;
  document.querySelector('#success-bar').style.width = `${data.success / 40 * 100}%`;
  document.querySelector('#tokens-bar').style.width = `${Math.min(100, data.tokens / 224 * 100)}%`;
  document.querySelector('#error-bar').style.width = `${Math.min(100, data.error / .1 * 100)}%`;
}));

const expertPath = document.querySelector('#expert-path');
const codecPath = document.querySelector('#codec-path');
const expertDot = document.querySelector('#expert-dot');
const codecDot = document.querySelector('#codec-dot');
const gapLine = document.querySelector('#gap-line');
const driftSlider = document.querySelector('#drift-slider');
function updateDrift() {
  const progress = Number(driftSlider.value) / 100;
  const expertPoint = expertPath.getPointAtLength(expertPath.getTotalLength() * progress);
  const codecPoint = codecPath.getPointAtLength(codecPath.getTotalLength() * progress);
  expertDot.setAttribute('cx', expertPoint.x); expertDot.setAttribute('cy', expertPoint.y);
  codecDot.setAttribute('cx', codecPoint.x); codecDot.setAttribute('cy', codecPoint.y);
  gapLine.setAttribute('x1', expertPoint.x); gapLine.setAttribute('y1', expertPoint.y);
  gapLine.setAttribute('x2', codecPoint.x); gapLine.setAttribute('y2', codecPoint.y);
  const gap = Math.hypot(codecPoint.x - expertPoint.x, codecPoint.y - expertPoint.y) * .085;
  document.querySelector('#drift-cm').textContent = `${gap.toFixed(1)} cm`;
  document.querySelector('#drift-step').textContent = driftSlider.value;
}
driftSlider.addEventListener('input', updateDrift);
updateDrift();

const schemes = {
  a: { percent: 70, success: '28 / 40', ceiling: '39 / 40', questions: '7', latency: '193 ms' },
  b: { percent: 55, success: '22 / 40', ceiling: '40 / 40', questions: '13', latency: '320 ms' }
};
document.querySelectorAll('.scheme-switch button').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.scheme-switch button').forEach(item => item.classList.toggle('active', item === button));
  const data = schemes[button.dataset.scheme];
  document.querySelector('#scheme-percent').textContent = data.percent;
  document.querySelector('#scheme-success').textContent = data.success;
  document.querySelector('#scheme-ceiling').textContent = data.ceiling;
  document.querySelector('#scheme-questions').textContent = data.questions;
  document.querySelector('#scheme-latency').textContent = data.latency;
  document.querySelector('#scheme-donut').style.setProperty('--value', data.percent);
}));

const traces = {
  success: { label: 'SUCCESS', count: '108 steps', image: 'assets/libero-place.jpg', color: '#72d8a0', description: 'One gripper closure, stable transport, release over the plate. Successful episodes are shorter than their demonstrations.', events: [['approach', 20], ['grasp', 39], ['lift', 55], ['place', 86], ['goal', 100]] },
  failure: { label: 'TIMEOUT', count: '220 steps', image: 'assets/libero-grasp.jpg', color: '#ff6b5f', description: 'A missed grasp, repeated closures, and no recovery strategy. All twelve bin25 failures end in a timeout.', events: [['approach', 14], ['miss', 23], ['retry', 43], ['retry', 68], ['timeout', 100]] }
};
function renderTrace(key) {
  const data = traces[key];
  document.querySelector('#trace-label').textContent = data.label;
  document.querySelector('#trace-label').style.color = data.color;
  document.querySelector('#trace-step-count').textContent = data.count;
  document.querySelector('#trace-image').src = data.image;
  document.querySelector('#trace-description').textContent = data.description;
  document.querySelector('#timeline').innerHTML = data.events.map(([name, pos]) => `<span style="left:${pos}%">${name}</span>`).join('');
}
document.querySelectorAll('.failure-toggle button').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.failure-toggle button').forEach(item => item.classList.toggle('active', item === button));
  renderTrace(button.dataset.trace);
}));
renderTrace('success');

document.querySelectorAll('.roadmap-expand').forEach(button => button.addEventListener('click', () => {
  const card = button.closest('.roadmap-card');
  const open = card.classList.toggle('open');
  button.setAttribute('aria-expanded', String(open));
  button.textContent = open ? 'Close protocol' : 'Proposed protocol';
}));

const observer = new IntersectionObserver(entries => entries.forEach(entry => {
  if (entry.isIntersecting) { entry.target.classList.add('visible'); observer.unobserve(entry.target); }
}), { threshold: .1 });
document.querySelectorAll('.reveal').forEach(element => observer.observe(element));

function updateScroll() {
  const max = document.documentElement.scrollHeight - innerHeight;
  document.querySelector('#scroll-progress').style.width = `${max > 0 ? scrollY / max * 100 : 0}%`;
}
addEventListener('scroll', updateScroll, { passive: true });
updateScroll();

document.querySelector('#motion-toggle').addEventListener('click', event => {
  const active = document.body.classList.toggle('reduce-motion');
  event.currentTarget.setAttribute('aria-pressed', String(active));
  event.currentTarget.textContent = active ? 'Motion reduced' : 'Reduce motion';
  document.querySelectorAll('video').forEach(video => active ? video.pause() : video.play().catch(() => {}));
});
