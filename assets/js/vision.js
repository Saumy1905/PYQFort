/* ═══════════════════════════════════════════════════════════════════════════
   PYQFort Vision Page — JavaScript Controller
   Animations · Navigation · Counters · Charts · Canvas Grid
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  // ── DOM Refs ──────────────────────────────────────────────────────────
  const wrapper = document.getElementById('vision-wrapper');
  if (!wrapper) return; // Not on vision page

  // Add vision-page class to body for CSS targeting
  document.body.classList.add('vision-page');

  const slidesContainer = document.getElementById('vision-slides');
  const slides = Array.from(wrapper.querySelectorAll('.vision-slide'));
  const dots = Array.from(wrapper.querySelectorAll('.vision-dot'));
  const progressBar = document.getElementById('vision-progress-bar');
  const scrollHint = document.getElementById('vision-scroll-hint');

  // Hide footer (fallback for browsers without CSS :has())
  document.body.classList.add('vision-hide-footer');

  let currentSlide = 0;
  let isAnimating = false;
  const animatedCounters = new Set();
  const animatedSlides = new Set();

  // ── Intersection Observer — Slide Visibility ──────────────────────────
  const slideObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const slide = entry.target;
          const index = slides.indexOf(slide);
          if (index === -1) return;

          currentSlide = index;
          slide.classList.add('is-visible');
          updateDots(index);
          updateProgress(index);
          triggerSlideAnimations(index);

          // Hide scroll hint after first slide
          if (index > 0 && scrollHint) {
            scrollHint.style.opacity = '0';
            scrollHint.style.pointerEvents = 'none';
          }
        }
      });
    },
    {
      root: null,
      threshold: 0.5,
    }
  );

  slides.forEach((slide) => slideObserver.observe(slide));

  // ── Navigation Dots ───────────────────────────────────────────────────
  function updateDots(index) {
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
  }

  dots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const target = parseInt(dot.dataset.slide, 10);
      navigateToSlide(target);
    });
  });

  function navigateToSlide(index) {
    if (index < 0 || index >= slides.length || isAnimating) return;
    isAnimating = true;
    slides[index].scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => { isAnimating = false; }, 800);
  }

  // ── Scroll Progress Bar ───────────────────────────────────────────────
  function updateProgress(index) {
    if (!progressBar) return;
    const pct = slides.length > 1 ? (index / (slides.length - 1)) * 100 : 0;
    progressBar.style.width = pct + '%';
  }

  // Also update on scroll for smoother progress
  window.addEventListener('scroll', () => {
    if (!progressBar) return;
    const scrollTop = window.scrollY;
    const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
    const pct = scrollHeight > 0 ? (scrollTop / scrollHeight) * 100 : 0;
    progressBar.style.width = Math.min(100, pct) + '%';
  }, { passive: true });

  // ── Keyboard Navigation ───────────────────────────────────────────────
  // Disabled for consistent UX across all devices
  // document.addEventListener('keydown', (e) => {
  //   if (!wrapper) return;
  //   if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
  //     e.preventDefault();
  //     navigateToSlide(currentSlide + 1);
  //   } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
  //     e.preventDefault();
  //     navigateToSlide(currentSlide - 1);
  //   }
  // });

  // ── Slide-Specific Animations ─────────────────────────────────────────
  function triggerSlideAnimations(index) {
    if (animatedSlides.has(index)) return;
    animatedSlides.add(index);

    // Animate all counters within this slide
    const slide = slides[index];
    const counters = slide.querySelectorAll('.vision-counter');
    counters.forEach((el) => animateCounter(el));

    // Slide-specific triggers
    switch (index) {
      case 1: // Philosophy — typewriter
        triggerTypewriter(slide);
        break;
      case 3: // Growth — draw chart
        drawGrowthChart();
        break;
      case 5: // Trust — ring animation
        animateTrustRing();
        break;
      case 7: // Speed — gauge animation
        animateGauges();
        break;
    }
  }

  // ── Counter Animation ─────────────────────────────────────────────────
  function animateCounter(el) {
    if (animatedCounters.has(el)) return;
    animatedCounters.add(el);

    const target = parseFloat(el.dataset.target);
    const suffix = el.dataset.suffix || '';
    const decimals = parseInt(el.dataset.decimals, 10) || 0;
    const duration = 2000;
    const start = performance.now();

    function easeOutExpo(t) {
      return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    }

    function update(now) {
      const elapsed = Math.min((now - start) / duration, 1);
      const eased = easeOutExpo(elapsed);
      const current = target * eased;

      if (decimals > 0) {
        el.textContent = current.toFixed(decimals) + suffix;
      } else {
        el.textContent = Math.round(current).toLocaleString() + suffix;
      }

      if (elapsed < 1) {
        requestAnimationFrame(update);
      } else {
        // Final value
        if (decimals > 0) {
          el.textContent = target.toFixed(decimals) + suffix;
        } else {
          el.textContent = Math.round(target).toLocaleString() + suffix;
        }
      }
    }

    requestAnimationFrame(update);
  }

  // ── Typewriter Effect ─────────────────────────────────────────────────
  function triggerTypewriter(slide) {
    const twEl = slide.querySelector('.vision-typewriter');
    if (!twEl) return;
    const fullText = twEl.dataset.text;
    if (!fullText) return;

    twEl.textContent = '';
    let i = 0;
    const speed = 30;

    function type() {
      if (i < fullText.length) {
        twEl.textContent += fullText.charAt(i);
        i++;
        setTimeout(type, speed);
      } else {
        twEl.classList.add('done');
      }
    }

    setTimeout(type, 400);
  }

  // ── Growth Chart (SVG) ────────────────────────────────────────────────
  function drawGrowthChart() {
    const svg = document.getElementById('vision-growth-chart');
    if (!svg) return;

    // Data points matching the image: Week 1 to Week 13 (288 to 8.67k sessions)
    const data = [
      { week: 1, sessions: 288 },
      { week: 3, sessions: 820 },
      { week: 5, sessions: 1950 },
      { week: 7, sessions: 3400 },
      { week: 9, sessions: 5600 },
      { week: 13, sessions: 8670 }
    ];

    const padding = { top: 40, right: 80, bottom: 60, left: 70 };
    const chartW = 800 - padding.left - padding.right;
    const chartH = 400 - padding.top - padding.bottom;
    const maxY = 9000; // Slightly above 8.67k for headroom
    const maxWeek = 13;

    // Create gradient for area fill
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    grad.setAttribute('id', 'v-chart-gradient');
    grad.setAttribute('x1', '0');
    grad.setAttribute('y1', '0');
    grad.setAttribute('x2', '0');
    grad.setAttribute('y2', '1');

    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', 'var(--v-electric)');
    stop1.setAttribute('stop-opacity', '0.4');

    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', 'var(--v-electric)');
    stop2.setAttribute('stop-opacity', '0.02');

    grad.appendChild(stop1);
    grad.appendChild(stop2);
    defs.appendChild(grad);
    svg.appendChild(defs);

    // Horizontal grid lines (5 lines for 0, 2k, 4k, 6k, 8k)
    const yLabels = [0, 2000, 4000, 6000, 8000];
    yLabels.forEach((val, i) => {
      const y = padding.top + chartH - (val / maxY) * chartH;
      
      // Grid line
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', padding.left);
      line.setAttribute('y1', y);
      line.setAttribute('x2', 800 - padding.right);
      line.setAttribute('y2', y);
      line.setAttribute('class', 'v-grid-line');
      line.setAttribute('stroke-dasharray', '4,4');
      svg.appendChild(line);

      // Y-axis label (right side)
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', 800 - padding.right + 15);
      text.setAttribute('y', y + 4);
      text.setAttribute('class', 'v-chart-label');
      text.setAttribute('text-anchor', 'start');
      text.textContent = val === 0 ? '0' : (val / 1000) + 'k';
      svg.appendChild(text);
    });

    // Vertical grid lines for each week
    data.forEach((pt) => {
      const x = padding.left + ((pt.week - 1) / (maxWeek - 1)) * chartW;
      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', x);
      line.setAttribute('y1', padding.top);
      line.setAttribute('x2', x);
      line.setAttribute('y2', 400 - padding.bottom);
      line.setAttribute('class', 'v-grid-line');
      line.setAttribute('stroke-dasharray', '4,4');
      svg.appendChild(line);
    });

    // X-axis labels (weeks)
    data.forEach((pt) => {
      const x = padding.left + ((pt.week - 1) / (maxWeek - 1)) * chartW;
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', x);
      text.setAttribute('y', 400 - padding.bottom + 25);
      text.setAttribute('class', 'v-chart-label');
      text.setAttribute('text-anchor', 'middle');
      text.textContent = 'Week ' + pt.week;
      svg.appendChild(text);
    });

    // X-axis title
    const xTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    xTitle.setAttribute('x', padding.left + chartW / 2);
    xTitle.setAttribute('y', 400 - 10);
    xTitle.setAttribute('class', 'v-chart-label');
    xTitle.setAttribute('text-anchor', 'middle');
    xTitle.textContent = 'Period';
    svg.appendChild(xTitle);

    // Y-axis title (Sessions)
    const yTitle = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    yTitle.setAttribute('x', 800 - 20);
    yTitle.setAttribute('y', 25);
    yTitle.setAttribute('class', 'v-chart-label');
    yTitle.setAttribute('text-anchor', 'end');
    yTitle.textContent = 'Sessions';
    svg.appendChild(yTitle);

    // Build path
    function scaleX(week) { 
      return padding.left + ((week - 1) / (maxWeek - 1)) * chartW; 
    }
    function scaleY(sessions) { 
      return padding.top + chartH - (sessions / maxY) * chartH; 
    }

    let linePath = '';
    let areaPath = `M ${scaleX(data[0].week)} ${400 - padding.bottom}`;

    data.forEach((pt, i) => {
      const px = scaleX(pt.week);
      const py = scaleY(pt.sessions);
      
      if (i === 0) {
        linePath += `M ${px} ${py}`;
        areaPath += ` L ${px} ${py}`;
      } else {
        // Smooth curve using bezier
        const prev = data[i - 1];
        const prevX = scaleX(prev.week);
        const prevY = scaleY(prev.sessions);
        const cpx1 = prevX + (px - prevX) * 0.5;
        const cpx2 = px - (px - prevX) * 0.5;
        
        linePath += ` C ${cpx1} ${prevY}, ${cpx2} ${py}, ${px} ${py}`;
        areaPath += ` C ${cpx1} ${prevY}, ${cpx2} ${py}, ${px} ${py}`;
      }

      // Add data point labels on the line
      const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      label.setAttribute('x', px);
      label.setAttribute('y', py - 10);
      label.setAttribute('class', 'v-chart-label');
      label.setAttribute('text-anchor', 'middle');
      label.setAttribute('fill', 'var(--v-electric)');
      label.setAttribute('font-weight', '600');
      label.textContent = pt.sessions >= 1000 ? (pt.sessions / 1000).toFixed(1) + 'k' : pt.sessions;
      svg.appendChild(label);
    });

    areaPath += ` L ${scaleX(data[data.length - 1].week)} ${400 - padding.bottom} Z`;

    // Area fill
    const area = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    area.setAttribute('d', areaPath);
    area.setAttribute('class', 'v-chart-area');
    svg.appendChild(area);

    // Line
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    line.setAttribute('d', linePath);
    line.setAttribute('class', 'v-chart-line');
    line.setAttribute('stroke-width', '3');
    
    // Animate line drawing
    const lineLen = line.getTotalLength ? line.getTotalLength() : 2000;
    line.style.strokeDasharray = lineLen;
    line.style.strokeDashoffset = lineLen;
    svg.appendChild(line);

    // Trigger line draw
    requestAnimationFrame(() => {
      line.style.transition = 'stroke-dashoffset 2.5s cubic-bezier(0.22, 0.61, 0.36, 1)';
      line.style.strokeDashoffset = '0';
    });

    // Add dots at each data point
    data.forEach((pt, i) => {
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('cx', scaleX(pt.week));
      dot.setAttribute('cy', scaleY(pt.sessions));
      dot.setAttribute('r', '5');
      dot.setAttribute('class', 'v-chart-dot');
      dot.style.opacity = '0';
      svg.appendChild(dot);

      setTimeout(() => {
        dot.style.transition = 'opacity 0.5s';
        dot.style.opacity = '1';
      }, 2000 + (i * 200));
    });
  }

  // ── Trust Ring Animation ──────────────────────────────────────────────
  function animateTrustRing() {
    const fillCircle = document.querySelector('.vision-trust-ring__fill');
    const trustBarFill = document.getElementById('vision-trust-bar-fill');

    if (fillCircle) {
      // 48% of circumference (2 * PI * 85 = 534.07)
      const circumference = 534.07;
      const targetOffset = circumference - (circumference * 0.48);
      setTimeout(() => {
        fillCircle.style.strokeDashoffset = targetOffset;
      }, 300);
    }

    if (trustBarFill) {
      setTimeout(() => {
        trustBarFill.style.width = '48%';
      }, 500);
    }
  }

  // ── Gauge Animation ───────────────────────────────────────────────────
  function animateGauges() {
    const gaugeLoad = document.getElementById('vision-gauge-load');
    const gaugePerf = document.getElementById('vision-gauge-perf');
    const arcLength = 251.33; // Semicircle arc length

    if (gaugeLoad) {
      // 1.1s out of ~3s max = ~37% fill (inverted — lower is better)
      const loadPct = 0.85; // Show 85% filled to indicate speed
      setTimeout(() => {
        gaugeLoad.style.strokeDashoffset = arcLength - arcLength * loadPct;
      }, 300);
    }

    if (gaugePerf) {
      // 89/100 = 89% fill
      const perfPct = 0.89;
      setTimeout(() => {
        gaugePerf.style.strokeDashoffset = arcLength - arcLength * perfPct;
      }, 500);
    }
  }

  // ── 3D Perspective Grid Canvas ────────────────────────────────────────
  function drawPerspectiveGrid() {
    const canvas = document.getElementById('vision-grid-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let w, h;
    let animFrame;
    let time = 0;

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      w = rect.width;
      h = rect.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      time += 0.003;

      // Responsive adjustments based on screen size
      const isMobile = w <= 768;
      const isTablet = w > 768 && w <= 992;
      
      // Vanishing point - adjust for mobile/tablet
      const vpx = isMobile ? w * 0.5 : (isTablet ? w * 0.6 : w * 0.65);
      const vpy = isMobile ? h * 0.35 : (isTablet ? h * 0.4 : h * 0.45);

      // Draw grid lines from bottom-right - reduce on smaller screens
      const numLines = isMobile ? 15 : (isTablet ? 20 : 30);
      const electricBlue = 'rgba(74, 108, 247, ';

      // Horizontal-like lines (receding into distance)
      for (let i = 0; i < numLines; i++) {
        const t = i / numLines;
        const y = vpy + (h - vpy) * t * t;
        const alpha = (0.08 + 0.12 * t) * (0.7 + 0.3 * Math.sin(time + t * 3));
        
        ctx.beginPath();
        ctx.strokeStyle = electricBlue + alpha + ')';
        ctx.lineWidth = 0.5 + t;
        
        // From left side to right
        const xStart = vpx - (vpx * 1.5) * t * t;
        const xEnd = vpx + (w - vpx + w * 0.5) * t * t;
        
        ctx.moveTo(xStart, y);
        ctx.lineTo(xEnd, y);
        ctx.stroke();
      }

      // Vertical-like lines (perspective converging to vanishing point) - reduce on smaller screens
      const numVLines = isMobile ? 12 : (isTablet ? 18 : 24);
      for (let i = 0; i < numVLines; i++) {
        const t = i / numVLines;
        const baseX = w * t;
        const alpha = (0.05 + 0.1 * Math.abs(t - 0.65) * 2) * (0.6 + 0.4 * Math.sin(time * 0.8 + t * 5));

        ctx.beginPath();
        ctx.strokeStyle = electricBlue + alpha + ')';
        ctx.lineWidth = 0.5;
        ctx.moveTo(vpx + (baseX - vpx) * 0.1, vpy + 10);
        ctx.lineTo(baseX, h + 20);
        ctx.stroke();
      }

      // Vertical pillars (building-like structures) - scale based on screen size
      const pillarScale = isMobile ? 0.5 : (isTablet ? 0.7 : 1);
      const pillars = [
        { x: w * 0.7, h: h * 0.4 * pillarScale, w: 30 * pillarScale },
        { x: w * 0.78, h: h * 0.55 * pillarScale, w: 25 * pillarScale },
        { x: w * 0.85, h: h * 0.35 * pillarScale, w: 20 * pillarScale },
        { x: w * 0.6, h: h * 0.3 * pillarScale, w: 22 * pillarScale },
        { x: w * 0.92, h: h * 0.45 * pillarScale, w: 18 * pillarScale },
      ];

      pillars.forEach((p, i) => {
        const pulseAlpha = 0.08 + 0.06 * Math.sin(time * 1.5 + i * 1.2);
        const baseY = h * 0.5 + (i * 20 * pillarScale);

        ctx.beginPath();
        ctx.fillStyle = electricBlue + pulseAlpha + ')';
        ctx.fillRect(p.x - p.w / 2, baseY - p.h, p.w, p.h);

        // Pillar edge glow
        ctx.beginPath();
        ctx.strokeStyle = electricBlue + (pulseAlpha * 2.5) + ')';
        ctx.lineWidth = 1;
        ctx.strokeRect(p.x - p.w / 2, baseY - p.h, p.w, p.h);

        // Horizontal lines on pillars
        const numHLines = Math.floor(p.h / (20 * pillarScale));
        for (let j = 0; j < numHLines; j++) {
          const ly = baseY - p.h + (p.h / numHLines) * j;
          ctx.beginPath();
          ctx.strokeStyle = electricBlue + (pulseAlpha * 1.5) + ')';
          ctx.lineWidth = 0.5;
          ctx.moveTo(p.x - p.w / 2, ly);
          ctx.lineTo(p.x + p.w / 2, ly);
          ctx.stroke();
        }
      });

      // Glow point at vanishing point - scale based on screen size
      const glowRadius = isMobile ? 80 : (isTablet ? 120 : 150);
      const gradient = ctx.createRadialGradient(vpx, vpy, 0, vpx, vpy, glowRadius);
      gradient.addColorStop(0, 'rgba(74, 108, 247, 0.08)');
      gradient.addColorStop(1, 'rgba(74, 108, 247, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(vpx - glowRadius, vpy - glowRadius, glowRadius * 2, glowRadius * 2);

      animFrame = requestAnimationFrame(draw);
    }

    resize();
    draw();

    window.addEventListener('resize', () => {
      resize();
    });

    // Pause when not visible
    const coverSlide = document.getElementById('vision-slide-0');
    const canvasObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (!animFrame) draw();
          } else {
            if (animFrame) {
              cancelAnimationFrame(animFrame);
              animFrame = null;
            }
          }
        });
      },
      { root: null, threshold: 0.1 }
    );
    if (coverSlide) canvasObserver.observe(coverSlide);
  }

  // ── Initialize ────────────────────────────────────────────────────────
  // Mark first slide visible immediately
  if (slides[0]) {
    slides[0].classList.add('is-visible');
    updateDots(0);
  }

  // Draw 3D grid
  drawPerspectiveGrid();

  // Touch/Swipe Support - Disabled for consistent UX across all devices
  // let touchStartY = 0;
  // let touchEndY = 0;

  // if (slidesContainer) {
  //   slidesContainer.addEventListener('touchstart', (e) => {
  //     touchStartY = e.changedTouches[0].screenY;
  //   }, { passive: true });

  //   slidesContainer.addEventListener('touchend', (e) => {
  //     touchEndY = e.changedTouches[0].screenY;
  //     const diff = touchStartY - touchEndY;
  //     if (Math.abs(diff) > 60) {
  //       if (diff > 0) {
  //         navigateToSlide(currentSlide + 1);
  //       } else {
  //         navigateToSlide(currentSlide - 1);
  //       }
  //     }
  //   }, { passive: true });
  // }

})();
