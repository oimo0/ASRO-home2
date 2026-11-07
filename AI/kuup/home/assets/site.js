'use strict';

const menuToggle = document.querySelector('.menu-toggle');
const siteNav = document.querySelector('#site-nav');
const smallScreen = matchMedia('(max-width: 820px)');

if (menuToggle && siteNav) {
  menuToggle.hidden = false;
  const toggleMenu = (open) => {
    menuToggle.setAttribute('aria-expanded', String(open));
    siteNav.classList.toggle('is-open', open);
  };

  menuToggle.addEventListener('click', () => {
    toggleMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
  });
  siteNav.addEventListener('click', () => toggleMenu(false));
  smallScreen.addEventListener('change', () => toggleMenu(false));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && menuToggle.getAttribute('aria-expanded') === 'true') {
      toggleMenu(false);
      menuToggle.focus();
    }
  });
}

for (const widget of document.querySelectorAll('.case-widget')) {
  const tabList = widget.querySelector('.case-tabs');
  const tabs = Array.from(tabList.querySelectorAll('a'));
  const panels = tabs.map((tab) => document.getElementById(tab.hash.slice(1)));

  tabList.setAttribute('role', 'tablist');
  tabs.forEach((tab, index) => {
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panels[index].id);
    panels[index].setAttribute('role', 'tabpanel');
    panels[index].setAttribute('aria-labelledby', tab.id);
    panels[index].tabIndex = 0;
  });

  const activate = (index, focus = false) => {
    tabs.forEach((tab, tabIndex) => {
      const selected = tabIndex === index;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      panels[tabIndex].hidden = !selected;
    });
    if (focus) tabs[index].focus();
  };
  const selectFromHash = () => {
    const index = tabs.findIndex((tab) => tab.hash === location.hash);
    if (index !== -1) activate(index);
  };

  tabs.forEach((tab, index) => {
    tab.addEventListener('click', (event) => {
      event.preventDefault();
      activate(index, true);
    });
    tab.addEventListener('keydown', (event) => {
      let target;
      if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
      if (event.key === 'ArrowLeft') target = (index + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') target = 0;
      if (event.key === 'End') target = tabs.length - 1;
      if (event.key === ' ') target = index;
      if (target === undefined) return;
      event.preventDefault();
      activate(target, true);
    });
  });

  activate(0);
  selectFromHash();
  addEventListener('hashchange', selectFromHash);
}

const art = document.querySelector('.hero-art');
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');

if (art && 'IntersectionObserver' in window && 'ResizeObserver' in window) {
  const logo = art.querySelector('.hero-logo');
  const motionToggle = art.querySelector('.motion-toggle');
  const canvas = art.querySelector('.particles');
  const context = canvas.getContext('2d', { alpha: true });
  let frame = 0;
  let visible = false;
  let paused = false;
  let width = 0;
  let height = 0;
  let started = 0;
  let lastFrame = 0;
  let points = [];
  let glow = [];

  const resize = () => {
    width = art.clientWidth;
    height = art.clientHeight;
    const ratio = Math.min(devicePixelRatio || 1, 1.65);
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  };

  const prepare = () => {
    const source = document.createElement('canvas');
    const sampleWidth = 120;
    const sampleHeight = Math.round(sampleWidth * logo.naturalHeight / logo.naturalWidth);
    source.width = sampleWidth;
    source.height = sampleHeight;
    const sample = source.getContext('2d', { willReadFrequently: true });
    if (!sample) return;
    sample.drawImage(logo, 0, 0, sampleWidth, sampleHeight);
    const pixels = sample.getImageData(0, 0, sampleWidth, sampleHeight).data;

    for (let y = 0; y < sampleHeight; y += 2) {
      for (let x = 0; x < sampleWidth; x += 2) {
        const offset = (y * sampleWidth + x) * 4;
        if (pixels[offset + 3] < 170) continue;
        const red = Math.min(255, pixels[offset] * .8 + 55);
        const green = Math.min(255, pixels[offset + 1] * .86 + 49);
        const blue = Math.min(255, pixels[offset + 2] * .82 + 45);
        points.push({
          x: (x + Math.random() * 1.05) / sampleWidth - .5,
          y: (y + Math.random() * 1.05) / sampleHeight - .5,
          phase: Math.random() * Math.PI * 2,
          radius: .62 + Math.random() * .86,
          spread: .2 + Math.random() * .8,
          opacity: .63 + Math.random() * .37,
          color: 'rgb(' + red + ',' + green + ',' + blue + ')',
        });
      }
    }
    glow = Array.from({ length: 62 }, () => ({
      phase: Math.random() * Math.PI * 2,
      ring: .65 + Math.random() * .53,
      radius: .45 + Math.random() * 1.2,
    }));
  };

  const draw = (now) => {
    frame = requestAnimationFrame(draw);
    if (now - lastFrame < 29) return;
    lastFrame = now;
    if (!started) started = now;
    const time = (now - started) / 1000;
    const formation = Math.min(1, time / 1.65);
    const scatter = (1 - formation) ** 3;
    if (formation === 1) art.classList.add('is-formed');
    const size = Math.min(width * .63, height * .72 * logo.naturalWidth / logo.naturalHeight);
    const logoHeight = size * logo.naturalHeight / logo.naturalWidth;
    const scale = width < 410 ? .82 : 1;
    context.clearRect(0, 0, width, height);
    context.fillStyle = '#a4bfff';
    for (const dot of glow) {
      const angle = dot.phase + time * .085;
      const orbitX = Math.cos(angle) * width * .43 * dot.ring;
      const orbitY = Math.sin(angle) * height * .23 * dot.ring;
      context.globalAlpha = .13 + .35 * (1 + Math.sin(time * 1.5 + dot.phase)) / 2;
      context.fillRect(width / 2 + orbitX * .9 + orbitY * .4, height / 2 - orbitX * .4 + orbitY * .9, dot.radius, dot.radius);
    }

    for (const dot of points) {
      const angle = dot.phase + time * 1.05;
      const drift = dot.spread * (2.05 + scatter * width * .37);
      const x = width / 2 + dot.x * size + Math.cos(angle) * drift;
      const y = height / 2 + dot.y * logoHeight + Math.sin(angle) * drift * .78;
      const radius = dot.radius * scale;
      context.fillStyle = dot.color;
      context.globalAlpha = dot.opacity * (.82 + Math.sin(angle) * .17) * (1 - scatter * .55);
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
    context.globalAlpha = 1;
  };

  const update = () => {
    motionToggle.hidden = !points.length || reduceMotion.matches;
    if (motionToggle.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      art.classList.remove('is-animated', 'is-formed');
      context.clearRect(0, 0, width, height);
      return;
    }
    if (visible && !document.hidden && !paused && !frame) {
      resize();
      art.classList.add('is-animated');
      frame = requestAnimationFrame(draw);
    } else if (!visible || document.hidden || paused) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };

  if (context) {
    motionToggle.addEventListener('click', () => {
      paused = !paused;
      motionToggle.textContent = paused ? '再生' : '一時停止';
      motionToggle.setAttribute('aria-label', paused ? '粒子アニメーションを再生' : '粒子アニメーションを一時停止');
      update();
    });
    const init = () => {
      if (!logo.naturalWidth) return;
      prepare();
      new ResizeObserver(() => { if (frame) resize(); }).observe(art);
      new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        update();
      }).observe(art);
      reduceMotion.addEventListener('change', update);
      document.addEventListener('visibilitychange', update);
    };
    if (logo.complete) init();
    else logo.addEventListener('load', init, { once: true });
  }
}
