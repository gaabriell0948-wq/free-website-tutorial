/* ==========================================================================
   Adrian Vale — Portfolio interactions (vanilla JS, no dependencies)
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var root = document.documentElement;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function onMediaChange(mq, fn) {
    if (mq.addEventListener) mq.addEventListener('change', fn);
    else if (mq.addListener) mq.addListener(fn);
  }
  function pad(n) { return (n < 10 ? '0' : '') + n; }

  /* ---------- Header state + scroll progress ---------- */
  var header = $('#site-header');
  var progressBar = $('#scroll-progress-bar');
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    header.classList.toggle('is-scrolled', y > 16);
    var max = document.documentElement.scrollHeight - window.innerHeight;
    progressBar.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
    ticking = false;
  }
  window.addEventListener('scroll', function () {
    if (!ticking) { ticking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  /* ---------- Mobile menu ---------- */
  var menuToggle = $('#menu-toggle');
  var menuLabel = $('.menu-toggle-label', menuToggle);
  var mobileMenu = $('#mobile-menu');
  var pageRegions = [$('#main'), $('.site-footer')];

  function isMenuOpen() { return menuToggle.getAttribute('aria-expanded') === 'true'; }

  function setMenu(open) {
    mobileMenu.classList.toggle('is-open', open);
    mobileMenu.setAttribute('aria-hidden', String(!open));
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (menuLabel) menuLabel.textContent = open ? 'Close' : 'Menu';
    root.classList.toggle('menu-open', open);
    // Keep keyboard and screen-reader focus inside the menu while it is open
    pageRegions.forEach(function (el) {
      if (!el) return;
      if (open) el.setAttribute('inert', '');
      else el.removeAttribute('inert');
    });
  }

  menuToggle.addEventListener('click', function () { setMenu(!isMenuOpen()); });
  $$('a', mobileMenu).forEach(function (link) {
    link.addEventListener('click', function () { setMenu(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isMenuOpen()) {
      setMenu(false);
      menuToggle.focus();
    }
  });
  onMediaChange(window.matchMedia('(min-width: 901px)'), function (e) {
    if (e.matches && isMenuOpen()) setMenu(false);
  });

  /* ---------- Active section highlight (desktop nav + mobile menu) ---------- */
  var spyLinks = $$('.nav-link, .mm-link');
  var hero = $('.hero');
  var spySections = $$('.nav-link')
    .map(function (link) { return $(link.getAttribute('href')); })
    .filter(Boolean);

  function setActive(id) {
    spyLinks.forEach(function (link) {
      var on = Boolean(id) && link.getAttribute('href') === '#' + id;
      link.classList.toggle('is-active', on);
      if (on) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  if ('IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        setActive(entry.target === hero ? null : entry.target.id);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    spySections.concat(hero).forEach(function (el) { spy.observe(el); });
  }

  /* ---------- Reveal on scroll ---------- */
  var revealEls = $$('[data-reveal]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var revealer = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -8% 0px' });
    revealEls.forEach(function (el) { revealer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Pointer effects (fine pointers only) ---------- */
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (finePointer) {
    $$('.spot').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var rect = card.getBoundingClientRect();
        card.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
        card.style.setProperty('--my', (e.clientY - rect.top) + 'px');
      });
    });
  }

  // Gentle parallax on the hero glow
  var orbs = $('.hero-orbs');
  if (finePointer && !reduceMotion && orbs) {
    var target = { x: 0, y: 0 };
    var current = { x: 0, y: 0 };
    var rafId = null;
    var step = function () {
      current.x += (target.x - current.x) * 0.06;
      current.y += (target.y - current.y) * 0.06;
      orbs.style.setProperty('--px', current.x.toFixed(2) + 'px');
      orbs.style.setProperty('--py', current.y.toFixed(2) + 'px');
      if (Math.abs(target.x - current.x) > 0.1 || Math.abs(target.y - current.y) > 0.1) {
        rafId = window.requestAnimationFrame(step);
      } else {
        rafId = null;
      }
    };
    hero.addEventListener('pointermove', function (e) {
      var rect = hero.getBoundingClientRect();
      target.x = ((e.clientX - rect.left) / rect.width - 0.5) * -28;
      target.y = ((e.clientY - rect.top) / rect.height - 0.5) * -28;
      if (!rafId) rafId = window.requestAnimationFrame(step);
    });
  }

  /* ---------- Shared: clone a project cover with unique gradient ids ---------- */
  var cloneCount = 0;
  function cloneCover(svg) {
    var suffix = '-c' + (++cloneCount);
    var clone = svg.cloneNode(true);
    var ids = $$('[id]', clone).map(function (node) {
      var oldId = node.id;
      node.id = oldId + suffix;
      return oldId;
    });
    if (ids.length) {
      $$('*', clone).forEach(function (el) {
        ['fill', 'stroke'].forEach(function (attr) {
          var value = el.getAttribute(attr);
          if (!value) return;
          ids.forEach(function (oldId) {
            if (value === 'url(#' + oldId + ')') el.setAttribute(attr, 'url(#' + oldId + suffix + ')');
          });
        });
      });
    }
    return clone;
  }

  var projects = $$('.project');

  /* ---------- Hero work index ---------- */
  var panelPreview = $('#panel-preview');
  var panelLinks = $$('.panel-list a');

  function activatePanel(link) {
    panelLinks.forEach(function (l) {
      var on = l === link;
      l.classList.toggle('is-active', on);
      if (l._preview) l._preview.classList.toggle('is-active', on);
    });
  }

  panelLinks.forEach(function (link) {
    var project = $(link.getAttribute('href'));
    if (!project) return;
    if (panelPreview) {
      link._preview = cloneCover($('.project-cover svg', project));
      panelPreview.appendChild(link._preview);
    }
    link.addEventListener('mouseenter', function () { activatePanel(link); });
    link.addEventListener('focus', function () { activatePanel(link); });
    link.addEventListener('click', function (e) {
      e.preventDefault();
      openProject(projects.indexOf(project), link);
    });
  });
  if (panelLinks.length) activatePanel(panelLinks[0]);

  /* ---------- Project filters ---------- */
  var filters = $$('.filter');
  var grid = $('#projects-grid');
  var emptyMsg = $('#projects-empty');

  filters.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var value = btn.getAttribute('data-filter');
      filters.forEach(function (b) {
        var on = b === btn;
        b.classList.toggle('is-active', on);
        b.setAttribute('aria-pressed', String(on));
      });
      var shown = 0;
      projects.forEach(function (project) {
        var cats = project.getAttribute('data-category').split(' ');
        var match = value === 'all' || cats.indexOf(value) !== -1;
        project.classList.toggle('is-hidden', !match);
        project.classList.remove('is-entering');
        if (match) {
          shown++;
          project.classList.add('is-visible');
          void project.offsetWidth; // restart the entrance animation
          project.classList.add('is-entering');
        }
      });
      grid.classList.toggle('is-filtered', value !== 'all');
      emptyMsg.hidden = shown > 0;
    });
  });

  /* ---------- Project dialog ---------- */
  var dialog = $('#project-dialog');
  var dialogInner = $('#dialog-inner');
  var dialogCover = $('#dialog-cover');
  var dialogTitle = $('#dialog-title');
  var dialogTags = $('#dialog-tags');
  var dialogContent = $('#dialog-content');
  var dialogIndex = $('#dialog-index');
  var dialogYear = $('#dialog-year');
  var dialogNextTitle = $('#dialog-next-title');
  var currentProject = -1;
  var lastTrigger = null;

  function projectName(project) { return $('.project-open', project).textContent.trim(); }

  function fillDialog(i) {
    var project = projects[i];
    var next = projects[(i + 1) % projects.length];
    currentProject = i;
    dialogCover.replaceChildren(cloneCover($('.project-cover svg', project)));
    dialogTitle.textContent = projectName(project);
    dialogTags.innerHTML = $('.tags', project).innerHTML;
    dialogContent.innerHTML = $('.project-details', project).innerHTML;
    dialogIndex.textContent = pad(i + 1) + ' / ' + pad(projects.length);
    dialogYear.textContent = $('.project-year', project).textContent;
    dialogNextTitle.textContent = projectName(next);
    dialog.scrollTop = 0;
  }

  function openProject(i, trigger) {
    if (i < 0) return;
    lastTrigger = trigger || null;
    fillDialog(i);
    if (!dialog.open) {
      if (typeof dialog.showModal === 'function') dialog.showModal();
      else dialog.setAttribute('open', '');
    }
    root.classList.add('dialog-open');
  }
  function closeProject() {
    if (typeof dialog.close === 'function') dialog.close();
    else { dialog.removeAttribute('open'); onDialogClose(); }
  }
  function onDialogClose() {
    root.classList.remove('dialog-open');
    if (lastTrigger) lastTrigger.focus({ preventScroll: true });
  }

  projects.forEach(function (project, i) {
    var trigger = $('.project-open', project);
    trigger.addEventListener('click', function () { openProject(i, trigger); });
  });
  $('#dialog-close').addEventListener('click', closeProject);
  dialog.addEventListener('close', onDialogClose);
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) closeProject(); // click on the backdrop
  });
  $('#dialog-next').addEventListener('click', function () {
    fillDialog((currentProject + 1) % projects.length);
    if (!reduceMotion) {
      dialogInner.classList.remove('is-swapping');
      void dialogInner.offsetWidth;
      dialogInner.classList.add('is-swapping');
    }
  });
  $('#dialog-cta').addEventListener('click', function () {
    lastTrigger = null; // let the link scroll to #contact instead of restoring focus
    closeProject();
  });

  /* ---------- Contact: copy email ---------- */
  var emailLink = $('#email-link');
  var email = emailLink.getAttribute('href').replace(/^mailto:/, '');
  var copyBtn = $('#copy-email');
  var copyLabel = $('#copy-email-label');
  var copyTimer;

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (err) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }
  function showCopied(ok) {
    copyLabel.textContent = ok ? 'Copied' : 'Press Ctrl+C';
    copyBtn.classList.toggle('is-copied', ok);
    clearTimeout(copyTimer);
    copyTimer = setTimeout(function () {
      copyLabel.textContent = 'Copy';
      copyBtn.classList.remove('is-copied');
    }, 2000);
  }
  copyBtn.addEventListener('click', function () {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(email).then(
        function () { showCopied(true); },
        function () { showCopied(fallbackCopy(email)); }
      );
    } else {
      showCopied(fallbackCopy(email));
    }
  });

  /* ---------- Contact: form validation + mailto hand-off ---------- */
  var form = $('#contact-form');
  var status = $('#form-status');
  var fields = {
    name: { el: $('#f-name'), validate: function (v) { return v.length >= 2 ? '' : 'Please enter your name.'; } },
    email: { el: $('#f-email'), validate: function (v) { return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) ? '' : 'Please enter a valid email address.'; } },
    message: { el: $('#f-message'), validate: function (v) { return v.length >= 10 ? '' : 'Tell me a little more (at least 10 characters).'; } }
  };

  function checkField(key) {
    var field = fields[key];
    var message = field.validate(field.el.value.trim());
    var errorId = field.el.id + '-error';
    field.el.closest('.field').classList.toggle('has-error', Boolean(message));
    $('#' + errorId).textContent = message;
    if (message) {
      field.el.setAttribute('aria-invalid', 'true');
      field.el.setAttribute('aria-describedby', errorId);
    } else {
      field.el.removeAttribute('aria-invalid');
      field.el.removeAttribute('aria-describedby');
    }
    return !message;
  }

  Object.keys(fields).forEach(function (key) {
    var el = fields[key].el;
    el.addEventListener('blur', function () { if (el.value.trim()) checkField(key); });
    el.addEventListener('input', function () {
      if (el.closest('.field').classList.contains('has-error')) checkField(key);
    });
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var firstInvalid = null;
    Object.keys(fields).forEach(function (key) {
      if (!checkField(key) && !firstInvalid) firstInvalid = fields[key].el;
    });
    if (firstInvalid) {
      status.textContent = 'Please fix the highlighted fields.';
      status.classList.add('is-error');
      firstInvalid.focus();
      return;
    }

    var name = fields.name.el.value.trim();
    var checked = form.querySelector('input[name="topic"]:checked');
    var topic = checked ? checked.value : 'General enquiry';
    var subject = 'New project enquiry: ' + topic + ' (' + name + ')';
    var body = fields.message.el.value.trim() +
      '\n\n—\n' + name + '\n' + fields.email.el.value.trim();

    status.classList.remove('is-error');
    status.textContent = 'Thanks, ' + name.split(' ')[0] + '! Your email app should now open with the message ready to send.';
    window.location.href = 'mailto:' + email +
      '?subject=' + encodeURIComponent(subject) +
      '&body=' + encodeURIComponent(body);
  });

  /* ---------- Local time + current year ---------- */
  var timeEl = $('#local-time');
  function updateTime() {
    try {
      timeEl.textContent = new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: timeEl.getAttribute('data-timezone'),
        timeZoneName: 'short'
      }).format(new Date());
    } catch (err) { /* keep the static fallback text */ }
  }
  updateTime();
  setInterval(updateTime, 30000);

  $('#year').textContent = String(new Date().getFullYear());
})();
