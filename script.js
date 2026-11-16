/* ==========================================================================
   Adrian Vale — Portfolio interactions (vanilla JS, no dependencies)
   ========================================================================== */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Header state + scroll progress ---------- */
  var header = $('#site-header');
  var progressBar = $('#scroll-progress-bar');
  var ticking = false;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    header.classList.toggle('is-scrolled', y > 24);
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
  var mobileMenu = $('#mobile-menu');

  function setMenu(open) {
    mobileMenu.classList.toggle('is-open', open);
    mobileMenu.setAttribute('aria-hidden', String(!open));
    menuToggle.setAttribute('aria-expanded', String(open));
    menuToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    document.body.classList.toggle('is-locked', open);
  }
  menuToggle.addEventListener('click', function () {
    setMenu(menuToggle.getAttribute('aria-expanded') !== 'true');
  });
  $$('a', mobileMenu).forEach(function (link) {
    link.addEventListener('click', function () { setMenu(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
      setMenu(false);
      menuToggle.focus();
    }
  });
  window.matchMedia('(min-width: 901px)').addEventListener('change', function (e) {
    if (e.matches) setMenu(false);
  });

  /* ---------- Active nav link (scroll spy) ---------- */
  var navLinks = $$('.nav-link');
  var sections = navLinks
    .map(function (link) { return $(link.getAttribute('href')); })
    .filter(Boolean);

  if ('IntersectionObserver' in window && sections.length) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (link) {
          var active = link.getAttribute('href') === '#' + entry.target.id;
          link.classList.toggle('is-active', active);
          if (active) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });

    // Clear the highlight while the hero is in view
    var hero = $('.hero');
    new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) {
        navLinks.forEach(function (link) {
          link.classList.remove('is-active');
          link.removeAttribute('aria-current');
        });
      }
    }, { rootMargin: '-45% 0px -50% 0px' }).observe(hero);
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
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) { revealer.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add('is-visible'); });
  }

  /* ---------- Count-up stats ---------- */
  var counters = $$('[data-count]');
  function animateCount(el) {
    var target = parseInt(el.getAttribute('data-count'), 10);
    var duration = 1600;
    var start = null;
    function frame(now) {
      if (start === null) start = now;
      var t = Math.min((now - start) / duration, 1);
      var eased = 1 - Math.pow(1 - t, 4);
      el.textContent = String(Math.round(target * eased));
      if (t < 1) window.requestAnimationFrame(frame);
    }
    window.requestAnimationFrame(frame);
  }
  if ('IntersectionObserver' in window && !reduceMotion) {
    var counterObs = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { counterObs.observe(el); });
  }

  /* ---------- Spotlight hover on cards ---------- */
  $$('.spot').forEach(function (card) {
    card.addEventListener('pointermove', function (e) {
      var rect = card.getBoundingClientRect();
      card.style.setProperty('--mx', (e.clientX - rect.left) + 'px');
      card.style.setProperty('--my', (e.clientY - rect.top) + 'px');
    });
  });

  /* ---------- Project filters ---------- */
  var filters = $$('.filter');
  var projects = $$('.project');
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
  var dialogCover = $('#dialog-cover');
  var dialogTitle = $('#dialog-title');
  var dialogTags = $('#dialog-tags');
  var dialogContent = $('#dialog-content');
  var lastTrigger = null;

  // Give cloned SVGs unique gradient ids so they never collide with the originals
  function cloneCover(svg) {
    var clone = svg.cloneNode(true);
    $$('[id]', clone).forEach(function (node) {
      var oldId = node.id;
      var newId = oldId + '-dlg';
      node.id = newId;
      $$('*', clone).forEach(function (el) {
        ['fill', 'stroke'].forEach(function (attr) {
          if (el.getAttribute(attr) === 'url(#' + oldId + ')') el.setAttribute(attr, 'url(#' + newId + ')');
        });
      });
    });
    return clone;
  }

  function openProject(project, trigger) {
    lastTrigger = trigger;
    dialogCover.replaceChildren(cloneCover($('.project-cover svg', project)));
    dialogTitle.textContent = $('.project-title', project).textContent;
    dialogTags.innerHTML = $('.project-tags', project).innerHTML;
    dialogContent.innerHTML = $('.project-details', project).innerHTML;
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
    dialog.scrollTop = 0;
    document.body.classList.add('is-locked');
  }
  function closeProject() {
    if (typeof dialog.close === 'function') dialog.close();
    else { dialog.removeAttribute('open'); onDialogClose(); }
  }
  function onDialogClose() {
    document.body.classList.remove('is-locked');
    if (lastTrigger) lastTrigger.focus({ preventScroll: true });
  }

  projects.forEach(function (project) {
    var trigger = $('.project-open', project);
    trigger.addEventListener('click', function () { openProject(project, trigger); });
  });
  $('#dialog-close').addEventListener('click', closeProject);
  dialog.addEventListener('close', onDialogClose);
  dialog.addEventListener('click', function (e) {
    if (e.target === dialog) closeProject(); // click on the backdrop
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
    message: { el: $('#f-message'), validate: function (v) { return v.length >= 10 ? '' : 'Tell me a little more — at least 10 characters.'; } }
  };

  function checkField(key) {
    var field = fields[key];
    var message = field.validate(field.el.value.trim());
    var wrap = field.el.closest('.field');
    wrap.classList.toggle('has-error', Boolean(message));
    $('#' + field.el.id + '-error').textContent = message;
    if (message) {
      field.el.setAttribute('aria-invalid', 'true');
      field.el.setAttribute('aria-describedby', field.el.id + '-error');
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
    var topic = (form.querySelector('input[name="topic"]:checked') || {}).value || 'General enquiry';
    var subject = 'New project enquiry — ' + topic + ' (' + name + ')';
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
        hour: '2-digit', minute: '2-digit',
        timeZone: timeEl.getAttribute('data-timezone'),
        timeZoneName: 'short'
      }).format(new Date());
    } catch (err) { /* keep the static fallback text */ }
  }
  updateTime();
  setInterval(updateTime, 30000);

  $('#year').textContent = String(new Date().getFullYear());
})();
