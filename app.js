const STORAGE_KEY = 'anubhuti-site-state';
const VISITOR_ID_KEY = 'anubhuti-visitor-id';

const todayIso = () => new Date().toISOString().slice(0, 10);
const tomorrowIso = () => {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return date.toISOString().slice(0, 10);
};
const addDays = (isoDate, days) => {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};
const dateLabel = (isoDate) =>
  new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(
    new Date(`${isoDate}T00:00:00`),
  );
const relativeDays = (isoDate) => {
  const current = new Date(`${todayIso()}T00:00:00`).getTime();
  const target = new Date(`${isoDate}T00:00:00`).getTime();
  return Math.ceil((target - current) / 86400000);
};
const safeId = (prefix) => {
  if (window.crypto && typeof window.crypto.randomUUID === 'function') {
    return `${prefix}-${window.crypto.randomUUID().slice(0, 8)}`;
  }

  return `${prefix}-${Math.random().toString(16).slice(2, 10)}`;
};
const escapeHtml = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');

const defaultState = () => ({
  totalVisitors: 0,
  analyticsVisitors: [],
  analyticsSubmissions: [],
  studentAccounts: [],
  studentActivity: [],
  forms: [
    {
      id: 'form-1',
      title: 'Summer Internship Experience 2026',
      category: 'Internship',
      deadline: '2026-06-15',
      description:
        'Share a detailed account of your internship role, responsibilities, learning outcomes, and reflections.',
      volumeId: 'vol-1',
      status: 'active',
      submissionCount: 12,
      createdAt: '2026-04-01',
    },
    {
      id: 'form-2',
      title: 'Field Practice Reflection',
      category: 'Field Work',
      deadline: '2026-07-01',
      description:
        'Capture field visits, service-learning outcomes, and observations from practical learning experiences.',
      volumeId: 'vol-2',
      status: 'active',
      submissionCount: 6,
      createdAt: '2026-04-10',
    },
  ],
  volumes: [
    {
      id: 'vol-1',
      volumeLabel: 'Volume I',
      year: '2024-25',
      publishedAt: '2025-03-20',
      description:
        'Foundation entries that capture early internship reflections and service-oriented field notes.',
      items: 4,
    },
    {
      id: 'vol-2',
      volumeLabel: 'Volume II',
      year: '2025-26',
      publishedAt: '2026-02-11',
      description:
        'A broad collection of internship experiences focused on skill-building, mentoring, and self-assessment.',
      items: 8,
    },
    {
      id: 'vol-3',
      volumeLabel: 'Volume III',
      year: '2026-27',
      publishedAt: '2026-09-15',
      description:
        'Upcoming archive volume reserved for the next published set of internship reports and summaries.',
      items: 0,
    },
  ],
  submissions: [
    {
      id: 'sub-1',
      formId: 'form-1',
      volumeId: 'vol-1',
      studentName: 'Aarav Sharma',
      rollNumber: 'DSVV-2419',
      programme: 'B.A. Yoga',
      organization: 'Seva Vidyalaya Trust',
      mentor: 'Dr. Meera Joshi',
      duration: '6 weeks',
      summary:
        'Worked with community learning activities, documented daily interactions, and learned structured reflection methods.',
      submittedAt: '2026-04-18',
    },
    {
      id: 'sub-2',
      formId: 'form-2',
      volumeId: 'vol-2',
      studentName: 'Ananya Verma',
      rollNumber: 'DSVV-2251',
      programme: 'M.A. Psychology',
      organization: 'Arogya Wellness Centre',
      mentor: 'Prof. N. Singh',
      duration: '4 weeks',
      summary:
        'Supported wellness outreach sessions, observed counseling workflows, and connected field notes with academic concepts.',
      submittedAt: '2026-04-22',
    },
  ],
});

const loadState = () => {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState();
    }

    const parsed = JSON.parse(raw);
    return {
      ...defaultState(),
      ...parsed,
      forms: Array.isArray(parsed.forms) ? parsed.forms : defaultState().forms,
      volumes: Array.isArray(parsed.volumes) ? parsed.volumes : defaultState().volumes,
      submissions: Array.isArray(parsed.submissions) ? parsed.submissions : defaultState().submissions,
    };
  } catch {
    return defaultState();
  }
};

let state = loadState();
let archiveQuery = '';
let adminUser = null;
let studentUser = null;
let authRole = null;
let activeExperienceId = null;

const elements = {
  pages: Array.from(document.querySelectorAll('.page')),
  navLinks: Array.from(document.querySelectorAll('[data-route]')),
  homeStats: document.getElementById('home-stats'),
  nextDeadline: document.getElementById('next-deadline'),
  nextDeadlineNote: document.getElementById('next-deadline-note'),
  volumeCount: document.getElementById('volume-count'),
  submissionCount: document.getElementById('submission-count'),
  formsMeta: document.getElementById('forms-meta'),
  studentFormsList: document.getElementById('student-forms-list'),
  submissionFormSelect: document.getElementById('submission-form-select'),
  submissionVolumeSelect: document.getElementById('submission-volume-select'),
  archiveSearch: document.getElementById('archive-search'),
  archiveMetrics: document.getElementById('archive-metrics'),
  archiveVolumeList: document.getElementById('archive-volume-list'),
  loginNavLink: document.getElementById('login-nav-link'),
  dashboardNavLink: document.getElementById('dashboard-nav-link'),
  adminNavLink: document.getElementById('admin-nav-link'),
  dashboardSummary: document.getElementById('dashboard-summary'),
  dashboardActions: document.getElementById('dashboard-actions'),
  dashboardExperiences: document.getElementById('dashboard-experiences'),
  adminVolumeDefault: document.getElementById('admin-volume-default'),
  adminFormCount: document.getElementById('admin-form-count'),
  adminFormsList: document.getElementById('admin-forms-list'),
  adminVolumeCount: document.getElementById('admin-volume-count'),
  adminVolumesList: document.getElementById('admin-volumes-list'),
  adminSubmissionCount: document.getElementById('admin-submission-count'),
  adminSubmissionsList: document.getElementById('admin-submissions-list'),
  adminStudentCount: document.getElementById('admin-student-count'),
  adminStudentActivity: document.getElementById('admin-student-activity'),
  adminLoginPanel: document.getElementById('admin-login-panel'),
  adminDashboard: document.getElementById('admin-dashboard'),
  adminStatus: document.getElementById('admin-status'),
  adminLoginForm: document.getElementById('admin-login-form'),
  experienceModal: document.getElementById('experience-modal'),
  experienceModalTitle: document.getElementById('experience-modal-title'),
  experienceModalContent: document.getElementById('experience-modal-content'),
  toast: document.getElementById('toast'),
};

function persist() {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

async function trackVisitor() {
  try {
    let visitorId = window.localStorage.getItem(VISITOR_ID_KEY);
    const payload = new URLSearchParams({
      page: getActivePage(),
      formId: '',
    });
    const response = await fetch('/api/visitors/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: payload,
      credentials: 'include',
    });

    if (response.ok) {
      const data = await response.json();
      if (!visitorId) {
        window.localStorage.setItem(VISITOR_ID_KEY, data.visitorId);
      }
    }
  } catch (error) {
    console.error('Failed to track visitor:', error);
  }
}

function notify(message) {
  if (!elements.toast) {
    return;
  }

  elements.toast.textContent = message;
  elements.toast.classList.add('show');
  window.clearTimeout(notify.timer);
  notify.timer = window.setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 2400);
}

function getActivePage() {
  const hash = window.location.hash.replace('#', '').trim();
  return hash || 'home';
}

function setActivePage() {
  const requested = getActivePage();
  let active = requested;

  if (requested === 'admin' && authRole !== 'admin') {
    active = authRole ? 'dashboard' : 'auth';
  }

  if (requested === 'dashboard' && !authRole) {
    active = 'auth';
  }

  if (active !== requested) {
    window.location.hash = `#${active}`;
  }

  elements.pages.forEach((page) => {
    page.hidden = page.dataset.page !== active;
  });

  elements.navLinks.forEach((link) => {
    link.classList.toggle('active', link.dataset.route === active);
  });
}

function findVolumeById(volumeId) {
  return state.volumes.find((volume) => volume.id === volumeId) || null;
}

function findFormById(formId) {
  return state.forms.find((form) => form.id === formId) || null;
}

function renderVolumeOptions(selectedId = '', includeBlank = true) {
  return [
    includeBlank ? '<option value="">No volume</option>' : '',
    ...state.volumes.map(
      (volume) => `
        <option value="${escapeHtml(volume.id)}" ${selectedId === volume.id ? 'selected' : ''}>
          ${escapeHtml(volume.volumeLabel)} • ${escapeHtml(volume.year)}
        </option>
      `,
    ),
  ].join('');
}

function getFilteredForms() {
  return state.forms
    .slice()
    .sort((left, right) => new Date(left.deadline) - new Date(right.deadline));
}

function getFilteredVolumes() {
  const query = archiveQuery.toLowerCase();
  return state.volumes
    .slice()
    .sort((left, right) => new Date(left.publishedAt) - new Date(right.publishedAt))
    .filter((volume) => {
      if (!query) {
        return true;
      }

      const searchable = [volume.volumeLabel, volume.year, volume.description]
        .concat(
          state.submissions
            .filter((submission) => submission.volumeId === volume.id)
            .map((submission) => [submission.studentName, submission.programme, submission.organization].join(' ')),
        )
        .join(' ')
        .toLowerCase();

      return searchable.includes(query);
    });
}

function getExperienceById(experienceId) {
  return state.submissions.find((submission) => submission.id === experienceId) || null;
}

function getExperienceExcerpt(summary) {
  const text = String(summary || '').trim();
  if (text.length <= 180) {
    return text;
  }

  return `${text.slice(0, 180).trim()}...`;
}

function showExperienceModal(experienceId) {
  activeExperienceId = experienceId;
  if (elements.experienceModal) {
    elements.experienceModal.hidden = false;
  }
  renderExperienceModal();
}

function hideExperienceModal() {
  activeExperienceId = null;
  if (elements.experienceModal) {
    elements.experienceModal.hidden = true;
  }
}

function renderStudentAuthGate(story) {
  return `
    <div class="auth-split">
      <article class="surface-card auth-card compact">
        <p class="eyebrow">Register</p>
        <h4>Create a student account</h4>
        <p class="muted-block">Register once to unlock full experience stories and keep your access active on this device.</p>
        <form class="stack form-grid" data-form="student-register">
          <label>
            Full name
            <input name="name" type="text" placeholder="Your name" required />
          </label>
          <label>
            Email
            <input name="email" type="email" placeholder="student@dsvv.ac.in" required />
          </label>
          <label>
            Password
            <input name="password" type="password" placeholder="Choose a password" required />
          </label>
          <button class="button primary full-width" type="submit">Register and continue</button>
        </form>
      </article>
      <article class="surface-card auth-card compact">
        <p class="eyebrow">Login</p>
        <h4>Already registered?</h4>
        <p class="muted-block">Sign in to read the full experience and return to this story anytime.</p>
        <form class="stack form-grid" data-form="student-login">
          <label>
            Email
            <input name="email" type="email" placeholder="student@dsvv.ac.in" required />
          </label>
          <label>
            Password
            <input name="password" type="password" placeholder="Your password" required />
          </label>
          <button class="button secondary full-width" type="submit">Login and read more</button>
        </form>
      </article>
    </div>
    <article class="surface-card story-preview">
      <div class="card-head">
        <div>
          <p class="eyebrow">Preview</p>
          <h4>${escapeHtml(story.studentName)}</h4>
        </div>
        <span class="badge">${escapeHtml(dateLabel(story.submittedAt))}</span>
      </div>
      <p class="muted-block">${escapeHtml(getExperienceExcerpt(story.summary))}</p>
    </article>
  `;
}

function renderExperienceModal() {
  if (!elements.experienceModal || !elements.experienceModalContent) {
    return;
  }

  const story = getExperienceById(activeExperienceId);
  if (!story) {
    elements.experienceModalContent.innerHTML = '<p class="muted-block">This experience is not available.</p>';
    return;
  }

  if (!authRole) {
    elements.experienceModalTitle.textContent = 'Register or login to read more';
    elements.experienceModalContent.innerHTML = renderStudentAuthGate(story);
    return;
  }

  const linkedForm = findFormById(story.formId);
  const linkedVolume = findVolumeById(story.volumeId);
  elements.experienceModalTitle.textContent = `${story.studentName}’s experience`;
  elements.experienceModalContent.innerHTML = `
    <article class="surface-card story-detail">
      <div class="card-head">
        <div>
          <p class="eyebrow">Full experience</p>
          <h4>${escapeHtml(story.studentName)}</h4>
          <p class="subtle">${escapeHtml(story.programme)} • ${escapeHtml(story.organization)}</p>
        </div>
        <span class="badge">${escapeHtml(dateLabel(story.submittedAt))}</span>
      </div>
      <div class="inline-list">
        <span>Form: ${escapeHtml(linkedForm ? linkedForm.title : 'Unknown')}</span>
        <span>Volume: ${escapeHtml(linkedVolume ? linkedVolume.volumeLabel : 'Unassigned')}</span>
        <span>Mentor: ${escapeHtml(story.mentor)}</span>
      </div>
      <p class="muted-block story-body">${escapeHtml(story.summary)}</p>
      <div class="item-actions">
        <button class="button ghost-link" type="button" data-action="student-logout">Logout</button>
      </div>
    </article>
  `;
}

async function fetchAuthState() {
  try {
    const authRes = await fetch('/api/auth/me', { credentials: 'include' });

    if (authRes.ok) {
      const data = await authRes.json();
      authRole = data.role || null;
      adminUser = data.role === 'admin' ? data.user || null : null;
      studentUser = data.role === 'student' ? data.user || null : null;

      if (data.role === 'admin') {
        const activityRes = await fetch('/api/students/activity', { credentials: 'include' });
        if (activityRes.ok) {
          const activityData = await activityRes.json();
          state.studentAccounts = activityData.accounts || [];
          state.studentActivity = activityData.events || [];
        }
      }
    } else {
      authRole = null;
      adminUser = null;
      studentUser = null;
    }
  } catch (error) {
    console.error('Failed to fetch auth state:', error);
  }

  updateNavState();
}

function renderHome() {
  const forms = getFilteredForms();
  const volumes = state.volumes.slice().sort((left, right) => new Date(right.publishedAt) - new Date(left.publishedAt));
  const submissions = state.submissions.slice().sort((left, right) => new Date(right.submittedAt) - new Date(left.submittedAt));
  const upcomingForm = forms.find((form) => form.status === 'active') || forms[0];

  elements.homeStats.innerHTML = [
    { label: 'Active forms', value: forms.filter((form) => form.status === 'active').length },
    { label: 'Archive volumes', value: state.volumes.length },
    { label: 'Submissions', value: state.submissions.length },
    { label: 'Site visitors', value: state.totalVisitors },
  ]
    .map(
      (item) => `
        <div class="stat-card">
          <strong>${item.value}</strong>
          <span>${item.label}</span>
        </div>
      `,
    )
    .join('');

  if (upcomingForm) {
    const days = relativeDays(upcomingForm.deadline);
    elements.nextDeadline.textContent = `${upcomingForm.title}`;
    elements.nextDeadlineNote.textContent =
      days >= 0 ? `${days} day${days === 1 ? '' : 's'} left • ${dateLabel(upcomingForm.deadline)}` : `Closed on ${dateLabel(upcomingForm.deadline)}`;
  } else {
    elements.nextDeadline.textContent = 'No live forms';
    elements.nextDeadlineNote.textContent = 'Create a new form in the admin panel to start collecting entries.';
  }

  elements.volumeCount.textContent = String(state.volumes.length);
  elements.submissionCount.textContent = String(state.submissions.length);

  const teaserForms = forms.slice(0, 3);
  const teaserVolumes = volumes.slice(0, 3);
  const recentSubmissions = submissions.slice(0, 2);

  const homeSection = document.querySelector('#home .hero-panel');
  if (homeSection) {
    const teaserMarkup = [
      `
        <div class="panel-card">
          <p>Top form</p>
          <strong>${escapeHtml(upcomingForm ? upcomingForm.title : 'Create one from admin')}</strong>
          <span>${upcomingForm ? escapeHtml(upcomingForm.description) : 'Forms will appear here once created.'}</span>
        </div>
      `,
      `
        <div class="panel-card">
          <p>Latest submission</p>
          <strong>${recentSubmissions[0] ? escapeHtml(recentSubmissions[0].studentName) : 'No submissions yet'}</strong>
          <span>${recentSubmissions[0] ? escapeHtml(recentSubmissions[0].organization) : 'Student entries appear after form submission.'}</span>
        </div>
      `,
    ].join('');
    homeSection.querySelectorAll('.panel-card').forEach((card, index) => {
      if (index > 0) {
        card.remove();
      }
    });
    homeSection.insertAdjacentHTML('beforeend', teaserMarkup);
  }

  const homeSpotlight = document.getElementById('home-spotlight');
  if (homeSpotlight) {
    const listMarkup = `
      <div class="two-column" data-home-list>
        <article class="surface-card">
          <div class="card-head">
            <div>
              <p class="eyebrow">Student experiences</p>
              <h3>Testimonials from the archive</h3>
            </div>
            <span class="subtle">Read the short preview, then unlock the full story</span>
          </div>
          <div class="stack">
            ${recentSubmissions.length
              ? recentSubmissions
                  .map(
                    (submission) => `
                      <article class="testimonial-card">
                        <div class="card-title-row">
                          <div>
                            <h4>${escapeHtml(submission.studentName)}</h4>
                            <p class="subtle">${escapeHtml(submission.programme)} • ${escapeHtml(submission.organization)}</p>
                          </div>
                          <span class="badge">${escapeHtml(dateLabel(submission.submittedAt))}</span>
                        </div>
                        <p class="muted-block">${escapeHtml(getExperienceExcerpt(submission.summary))}</p>
                        <div class="item-actions">
                          <button class="button secondary" type="button" data-action="open-experience" data-id="${escapeHtml(submission.id)}">
                            Read more
                          </button>
                        </div>
                      </article>
                    `,
                  )
                  .join('')
              : '<p class="muted-block">Student testimonials will appear here after the first submission.</p>'}
          </div>
        </article>
        <article class="surface-card">
          <div class="card-head">
            <div>
              <p class="eyebrow">Active forms</p>
              <h3>Current submission windows</h3>
            </div>
            <span class="subtle">Simple and current</span>
          </div>
          <div class="stack">
            ${teaserForms
              .map(
                (form) => `
                  <div class="card">
                    <div class="card-title-row">
                      <div>
                        <h4>${escapeHtml(form.title)}</h4>
                        <p class="subtle">${escapeHtml(form.category)} • ${dateLabel(form.deadline)}</p>
                      </div>
                      <span class="status-chip ${form.status}">${escapeHtml(form.status)}</span>
                    </div>
                    <p class="muted-block">${escapeHtml(form.description)}</p>
                  </div>
                `,
              )
              .join('')}
          </div>
        </article>
        <article class="surface-card">
          <div class="card-head">
            <div>
              <p class="eyebrow">Recent volumes</p>
              <h3>Archive preview</h3>
            </div>
            <span class="subtle">Volume-based records</span>
          </div>
          <div class="stack">
            ${teaserVolumes
              .map(
                (volume) => `
                  <div class="card">
                    <div class="card-title-row">
                      <div>
                        <h4>${escapeHtml(volume.volumeLabel)}</h4>
                        <p class="subtle">${escapeHtml(volume.year)} • ${dateLabel(volume.publishedAt)}</p>
                      </div>
                      <span class="badge">${volume.items} items</span>
                    </div>
                    <p class="muted-block">${escapeHtml(volume.description)}</p>
                  </div>
                `,
              )
              .join('')}
          </div>
        </article>
      </div>
    `;
    homeSpotlight.innerHTML = listMarkup;
  }
}

function renderDashboard() {
  if (!elements.dashboardSummary || !elements.dashboardActions || !elements.dashboardExperiences) {
    return;
  }

  const user = getSignedInUser();
  if (!user) {
    elements.dashboardSummary.innerHTML = '';
    elements.dashboardActions.innerHTML = '';
    elements.dashboardExperiences.innerHTML = '';
    return;
  }

  const roleLabel = authRole === 'admin' ? 'Administrator' : 'Student';
  const actionLinks = [
    { label: 'Go to forms', href: '#forms' },
    { label: 'View archive', href: '#archive' },
    { label: 'Read testimonials', href: '#home' },
  ];

  if (authRole === 'admin') {
    actionLinks.unshift({ label: 'Open admin panel', href: '#admin' });
  }

  elements.dashboardSummary.innerHTML = `
    <div class="card">
      <div class="card-title-row">
        <div>
          <p class="eyebrow">Signed in</p>
          <h4>${escapeHtml(user.name)}</h4>
        </div>
        <span class="badge">${roleLabel}</span>
      </div>
      <p class="muted-block">${escapeHtml(user.email)}</p>
      <div class="inline-list">
        <span>Role: ${roleLabel}</span>
        <span>Status: Active</span>
      </div>
    </div>
    ${authRole === 'admin'
      ? `
        <div class="card">
          <div class="card-title-row">
            <div>
              <h4>Admin overview</h4>
              <p class="subtle">All pages and records are available to you.</p>
            </div>
          </div>
          <div class="inline-list">
            <span>Forms: ${state.forms.length}</span>
            <span>Volumes: ${state.volumes.length}</span>
            <span>Submissions: ${state.submissions.length}</span>
          </div>
        </div>
      `
      : `
        <div class="card">
          <div class="card-title-row">
            <div>
              <h4>Student access</h4>
              <p class="subtle">Use this dashboard to continue to forms and testimonials.</p>
            </div>
          </div>
          <div class="inline-list">
            <span>Forms available: ${state.forms.filter((form) => form.status === 'active').length}</span>
            <span>Archive volumes: ${state.volumes.length}</span>
          </div>
        </div>
      `}
  `;

  elements.dashboardActions.innerHTML = `${actionLinks
    .map(
      (item) => `
        <a class="button secondary" href="${escapeHtml(item.href)}">${escapeHtml(item.label)}</a>
      `,
    )
    .join('')}
    <button class="button ghost-link" type="button" data-action="logout-account">Logout</button>
  `;

  const recentStories = state.submissions.slice(0, 3);
  elements.dashboardExperiences.innerHTML = recentStories.length
    ? recentStories
        .map(
          (submission) => `
            <article class="card">
              <div class="card-title-row">
                <div>
                  <h4>${escapeHtml(submission.studentName)}</h4>
                  <p class="subtle">${escapeHtml(submission.programme)} • ${escapeHtml(submission.organization)}</p>
                </div>
                <span class="badge">${escapeHtml(dateLabel(submission.submittedAt))}</span>
              </div>
              <p class="muted-block">${escapeHtml(getExperienceExcerpt(submission.summary))}</p>
              <div class="item-actions">
                <button class="button secondary" type="button" data-action="open-experience" data-id="${escapeHtml(submission.id)}">Read more</button>
              </div>
            </article>
          `,
        )
        .join('')
    : '<p class="muted-block">No testimonials are available yet.</p>';
}

function renderForms() {
  const forms = getFilteredForms();
  const activeForms = forms.filter((form) => form.status === 'active');

  elements.formsMeta.textContent = `${activeForms.length} live forms • ${state.submissions.length} total submissions`;

  elements.studentFormsList.innerHTML = forms
    .map((form) => {
      const days = relativeDays(form.deadline);
      const statusClass = form.status === 'active' && days >= 0 ? 'active' : 'closed';
      const deadlineText =
        days >= 0 ? `${days} day${days === 1 ? '' : 's'} left` : `Closed ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;

      return `
        <article class="card">
          <div class="card-title-row">
            <div>
              <h4>${escapeHtml(form.title)}</h4>
              <p class="subtle">${escapeHtml(form.category)} • ${dateLabel(form.deadline)}</p>
            </div>
            <span class="status-chip ${statusClass}">${escapeHtml(deadlineText)}</span>
          </div>
          <p class="muted-block">${escapeHtml(form.description)}</p>
          <div class="inline-list">
            <span>${escapeHtml(form.status)}</span>
            <span>${escapeHtml(findVolumeById(form.volumeId)?.volumeLabel || 'No volume')}</span>
            <span>${form.submissionCount ?? 0} submissions</span>
          </div>
        </article>
      `;
    })
    .join('');

  const formOptions = forms
    .map(
      (form) => `
        <option value="${escapeHtml(form.id)}">
          ${escapeHtml(form.title)}
        </option>
      `,
    )
    .join('');

  elements.submissionFormSelect.innerHTML = formOptions || '<option value="">No forms available</option>';
  elements.submissionVolumeSelect.innerHTML = [
    '<option value="">No volume selected</option>',
    ...state.volumes.map(
      (volume) => `
        <option value="${escapeHtml(volume.id)}">${escapeHtml(volume.volumeLabel)} • ${escapeHtml(volume.year)}</option>
      `,
    ),
  ].join('');
}

function renderArchive() {
  const volumes = getFilteredVolumes();
  const formCount = state.forms.length;
  const submissionCount = state.submissions.length;
  const volumeCount = state.volumes.length;

  elements.archiveMetrics.innerHTML = [
    { label: 'Volumes', value: volumeCount },
    { label: 'Forms', value: formCount },
    { label: 'Submissions', value: submissionCount },
  ]
    .map(
      (item) => `
        <div class="metric-pill">
          ${item.label}: ${item.value}
        </div>
      `,
    )
    .join('');

  if (!volumes.length) {
    elements.archiveVolumeList.innerHTML = `
      <article class="surface-card">
        <p class="muted-block">No volumes match your search yet.</p>
      </article>
    `;
    return;
  }

  elements.archiveVolumeList.innerHTML = volumes
    .map((volume) => {
      const volumeSubmissions = state.submissions.filter((submission) => submission.volumeId === volume.id);
      return `
        <article class="archive-volume">
          <div class="card-title-row">
            <div>
              <p class="eyebrow">Archive collection</p>
              <h3>${escapeHtml(volume.volumeLabel)}</h3>
              <p class="subtle">${escapeHtml(volume.year)} • ${dateLabel(volume.publishedAt)}</p>
            </div>
            <span class="badge">${volumeSubmissions.length} linked entries</span>
          </div>
          <p class="muted-block">${escapeHtml(volume.description)}</p>
          <div class="subgrid">
            <div>
              <div class="small-label">Published</div>
              <strong>${dateLabel(volume.publishedAt)}</strong>
            </div>
            <div>
              <div class="small-label">Volume items</div>
              <strong>${volume.items}</strong>
            </div>
            <div>
              <div class="small-label">Focus</div>
              <strong>${escapeHtml(volume.volumeLabel)}</strong>
            </div>
          </div>
          <div class="stack" style="margin-top: 16px;">
            ${volumeSubmissions.length
              ? volumeSubmissions
                  .map(
                    (submission) => `
                      <div class="card">
                        <div class="card-title-row">
                          <div>
                            <h4>${escapeHtml(submission.studentName)}</h4>
                            <p class="subtle">${escapeHtml(submission.programme)} • ${escapeHtml(submission.organization)}</p>
                          </div>
                          <span class="status-chip active">${escapeHtml(submission.duration)}</span>
                        </div>
                        <p class="muted-block">${escapeHtml(submission.summary)}</p>
                      </div>
                    `,
                  )
                  .join('')
              : '<p class="muted-block">No submissions have been linked to this volume yet.</p>'}
          </div>
        </article>
      `;
    })
    .join('');
}

function renderAdmin() {
  if (!elements.adminDashboard) {
    return;
  }

  elements.adminDashboard.hidden = authRole !== 'admin';

  if (authRole !== 'admin') {
    elements.adminFormCount.textContent = '';
    elements.adminVolumeCount.textContent = '';
    elements.adminSubmissionCount.textContent = '';
    elements.adminStudentCount.textContent = '';
    elements.adminFormsList.innerHTML = '';
    elements.adminVolumesList.innerHTML = '';
    elements.adminSubmissionsList.innerHTML = '';
    elements.adminStudentActivity.innerHTML = '';
    if (elements.adminStatus) {
      elements.adminStatus.innerHTML = '';
    }
    return;
  }

  if (elements.adminStatus) {
    elements.adminStatus.innerHTML = `
      <div>
        <p class="eyebrow">Signed in</p>
        <strong>${escapeHtml(adminUser.name)}</strong>
        <p class="subtle">${escapeHtml(adminUser.email)}</p>
      </div>
      <button class="button ghost-link" type="button" data-action="admin-logout">Logout</button>
    `;
  }

  elements.adminFormCount.textContent = `${state.forms.length} forms managed`;
  elements.adminVolumeCount.textContent = `${state.volumes.length} volumes managed`;
  elements.adminSubmissionCount.textContent = `${state.submissions.length} submissions stored`;
  elements.adminStudentCount.textContent = `${state.studentAccounts.length} registered students`;

  const analyticsHtml = document.getElementById('admin-analytics-summary');
  if (analyticsHtml && state.analyticsSubmissions.length > 0) {
    const submissionsHtml = state.analyticsSubmissions
      .map(
        (item) => `
          <div class="stat-card">
            <strong>${item.count}</strong>
            <span>${escapeHtml(item.title)}</span>
          </div>
        `,
      )
      .join('');
    analyticsHtml.innerHTML = `<h3>Submissions by Form</h3><div class="stat-grid">${submissionsHtml}</div>`;
  }

  elements.adminVolumeDefault.innerHTML = renderVolumeOptions('', true) || '<option value="">Create a volume first</option>';
  elements.adminFormsList.innerHTML = state.forms
    .slice()
    .sort((left, right) => new Date(left.deadline) - new Date(right.deadline))
    .map(
      (form) => `
        <article class="admin-item" data-form-id="${escapeHtml(form.id)}">
          <div class="admin-item-head">
            <div>
              <h4>${escapeHtml(form.title)}</h4>
              <p class="subtle">${escapeHtml(form.category)} • Deadline ${dateLabel(form.deadline)}</p>
            </div>
            <span class="status-chip ${form.status}">${escapeHtml(form.status)}</span>
          </div>
          <form class="stack form-grid" data-form="edit-form" data-id="${escapeHtml(form.id)}">
            <label>
              Title
              <input name="title" value="${escapeHtml(form.title)}" required />
            </label>
            <label>
              Category
              <input name="category" value="${escapeHtml(form.category)}" required />
            </label>
            <label>
              Deadline
              <input name="deadline" type="date" value="${escapeHtml(form.deadline)}" required />
            </label>
            <label>
              Status
              <select name="status">
                <option value="active" ${form.status === 'active' ? 'selected' : ''}>Active</option>
                <option value="draft" ${form.status === 'draft' ? 'selected' : ''}>Draft</option>
                <option value="closed" ${form.status === 'closed' ? 'selected' : ''}>Closed</option>
              </select>
            </label>
            <label>
              Archive volume
              <select name="volumeId">
                ${renderVolumeOptions(form.volumeId)}
              </select>
            </label>
            <label class="full-width">
              Description
              <textarea name="description" rows="4" required>${escapeHtml(form.description)}</textarea>
            </label>
            <div class="item-actions full-width">
              <button class="button primary" type="submit">Save form</button>
              <button class="button secondary" type="button" data-action="extend-form" data-days="7" data-id="${escapeHtml(form.id)}">
                Extend 7 days
              </button>
              <button class="button secondary" type="button" data-action="extend-form" data-days="14" data-id="${escapeHtml(form.id)}">
                Extend 14 days
              </button>
              <button class="button warning-link" type="button" data-action="delete-form" data-id="${escapeHtml(form.id)}">
                Delete form
              </button>
            </div>
          </form>
        </article>
      `,
    )
    .join('');

  elements.adminVolumesList.innerHTML = state.volumes
    .slice()
    .sort((left, right) => new Date(right.publishedAt) - new Date(left.publishedAt))
    .map(
      (volume) => `
        <article class="admin-item" data-volume-id="${escapeHtml(volume.id)}">
          <div class="admin-item-head">
            <div>
              <h4>${escapeHtml(volume.volumeLabel)}</h4>
              <p class="subtle">${escapeHtml(volume.year)} • ${dateLabel(volume.publishedAt)}</p>
            </div>
            <span class="badge">${volume.items} items</span>
          </div>
          <form class="stack form-grid" data-form="edit-volume" data-id="${escapeHtml(volume.id)}">
            <label>
              Volume label
              <input name="volumeLabel" value="${escapeHtml(volume.volumeLabel)}" required />
            </label>
            <label>
              Academic year
              <input name="year" value="${escapeHtml(volume.year)}" required />
            </label>
            <label>
              Publication date
              <input name="publishedAt" type="date" value="${escapeHtml(volume.publishedAt)}" required />
            </label>
            <label>
              Items
              <input name="items" type="number" min="0" value="${volume.items}" required />
            </label>
            <label class="full-width">
              Description
              <textarea name="description" rows="4" required>${escapeHtml(volume.description)}</textarea>
            </label>
            <div class="item-actions full-width">
              <button class="button primary" type="submit">Save volume</button>
              <button class="button warning-link" type="button" data-action="delete-volume" data-id="${escapeHtml(volume.id)}">
                Delete volume
              </button>
            </div>
          </form>
        </article>
      `,
    )
    .join('');

  elements.adminSubmissionsList.innerHTML = state.submissions.length
    ? state.submissions
        .slice()
        .sort((left, right) => new Date(right.submittedAt) - new Date(left.submittedAt))
        .map((submission) => {
          const linkedForm = findFormById(submission.formId);
          const linkedVolume = findVolumeById(submission.volumeId);
          return `
            <article class="submission-card">
              <div class="submission-head">
                <div>
                  <h4>${escapeHtml(submission.studentName)}</h4>
                  <p class="subtle">${escapeHtml(submission.rollNumber)} • ${escapeHtml(submission.programme)}</p>
                </div>
                <span class="badge">${escapeHtml(dateLabel(submission.submittedAt))}</span>
              </div>
              <p class="muted-block">${escapeHtml(submission.summary)}</p>
              <div class="inline-list">
                <span>Form: ${escapeHtml(linkedForm ? linkedForm.title : 'Unknown')}</span>
                <span>Volume: ${escapeHtml(linkedVolume ? linkedVolume.volumeLabel : 'Unassigned')}</span>
                <span>Org: ${escapeHtml(submission.organization)}</span>
              </div>
              <form class="stack form-grid" data-form="edit-submission" data-id="${escapeHtml(submission.id)}" style="margin-top: 14px;">
                <label>
                  Linked volume
                  <select name="volumeId">
                    <option value="">No volume</option>
                    ${state.volumes
                      .map(
                        (volume) => `
                          <option value="${escapeHtml(volume.id)}" ${submission.volumeId === volume.id ? 'selected' : ''}>
                            ${escapeHtml(volume.volumeLabel)}
                          </option>
                        `,
                      )
                      .join('')}
                  </select>
                </label>
                <label>
                  Summary
                  <textarea name="summary" rows="4" required>${escapeHtml(submission.summary)}</textarea>
                </label>
                <div class="item-actions full-width">
                  <button class="button primary" type="submit">Update entry</button>
                  <button class="button warning-link" type="button" data-action="delete-submission" data-id="${escapeHtml(submission.id)}">
                    Delete entry
                  </button>
                </div>
              </form>
            </article>
          `;
        })
        .join('')
    : '<p class="muted-block">No submissions have been stored yet.</p>';

  elements.adminStudentActivity.innerHTML = state.studentActivity.length
    ? state.studentActivity
        .slice(0, 10)
        .map(
          (item) => `
            <div class="card">
              <div class="card-title-row">
                <div>
                  <h4>${escapeHtml(item.name)}</h4>
                  <p class="subtle">${escapeHtml(item.email)}</p>
                </div>
                <span class="badge">${escapeHtml(item.eventType)}</span>
              </div>
              <p class="muted-block">${escapeHtml(dateLabel(String(item.createdAt).slice(0, 10)))} login activity</p>
            </div>
          `,
        )
        .join('')
    : '<p class="muted-block">Student registrations and logins will appear here.</p>';
}

function renderAll() {
  setActivePage();
  renderHome();
  renderForms();
  renderArchive();
  renderDashboard();
  renderAdmin();
}

function upsertForm(formData, id = null) {
  const payload = {
    title: formData.get('title').trim(),
    category: formData.get('category').trim(),
    deadline: String(formData.get('deadline')),
    description: formData.get('description').trim(),
    volumeId: String(formData.get('volumeId') || ''),
    status: formData.get('status') || 'active',
  };

  if (id) {
    state.forms = state.forms.map((form) => (form.id === id ? { ...form, ...payload } : form));
    notify('Form updated.');
  } else {
    state.forms.unshift({
      id: safeId('form'),
      ...payload,
      submissionCount: 0,
      createdAt: todayIso(),
    });
    notify('Form created.');
  }

  persist();
  renderAll();
}

function upsertVolume(formData, id = null) {
  const payload = {
    volumeLabel: formData.get('volumeLabel').trim(),
    year: formData.get('year').trim(),
    publishedAt: String(formData.get('publishedAt')),
    description: formData.get('description').trim(),
    items: Number(formData.get('items') || 0),
  };

  if (id) {
    state.volumes = state.volumes.map((volume) => (volume.id === id ? { ...volume, ...payload } : volume));
    notify('Volume updated.');
  } else {
    state.volumes.unshift({
      id: safeId('vol'),
      ...payload,
    });
    notify('Volume created.');
  }

  persist();
  renderAll();
}

function submitStudentExperience(formData) {
  const formId = String(formData.get('formId'));
  const selectedForm = findFormById(formId);

  if (!selectedForm) {
    notify('Select a valid form first.');
    return;
  }

  if (selectedForm.status !== 'active') {
    notify('This form is closed or in draft status.');
    return;
  }

  if (selectedForm.deadline < todayIso()) {
    notify('The submission deadline has passed.');
    return;
  }

  const payload = {
    id: safeId('sub'),
    formId,
    volumeId: String(formData.get('volumeId') || selectedForm.volumeId || ''),
    studentName: formData.get('studentName').trim(),
    rollNumber: formData.get('rollNumber').trim(),
    programme: formData.get('programme').trim(),
    organization: formData.get('organization').trim(),
    mentor: formData.get('mentor').trim(),
    duration: formData.get('duration').trim(),
    summary: formData.get('summary').trim(),
    submittedAt: todayIso(),
  };

  state.submissions.unshift(payload);
  state.forms = state.forms.map((form) =>
    form.id === formId ? { ...form, submissionCount: (form.submissionCount || 0) + 1 } : form,
  );
  persist();
  renderAll();
  window.document.getElementById('student-submission-form').reset();
  elements.submissionFormSelect.value = formId;
  notify('Experience submitted successfully.');
}

function deleteItem(collection, id, label) {
  const removedItem = state[collection].find((item) => item.id === id) || null;
  state[collection] = state[collection].filter((item) => item.id !== id);
  if (collection === 'forms') {
    state.submissions = state.submissions.filter((submission) => submission.formId !== id);
  }
  if (collection === 'submissions' && removedItem) {
    state.forms = state.forms.map((form) =>
      form.id === removedItem.formId ? { ...form, submissionCount: Math.max((form.submissionCount || 0) - 1, 0) } : form,
    );
  }
  if (collection === 'volumes') {
    state.forms = state.forms.map((form) => (form.volumeId === id ? { ...form, volumeId: '' } : form));
    state.submissions = state.submissions.map((submission) =>
      submission.volumeId === id ? { ...submission, volumeId: '' } : submission,
    );
  }
  persist();
  renderAll();
  notify(`${label} deleted.`);
}

function extendDeadline(formId, days) {
  const form = findFormById(formId);
  if (!form) {
    return;
  }

  const base = form.deadline > todayIso() ? form.deadline : todayIso();
  state.forms = state.forms.map((item) =>
    item.id === formId ? { ...item, deadline: addDays(base, days), status: 'active' } : item,
  );
  persist();
  renderAll();
  notify(`Deadline extended by ${days} days.`);
}

function updateSubmission(id, formData) {
  state.submissions = state.submissions.map((submission) =>
    submission.id === id
      ? {
          ...submission,
          volumeId: String(formData.get('volumeId') || ''),
          summary: formData.get('summary').trim(),
        }
      : submission,
  );
  persist();
  renderAll();
  notify('Submission updated.');
}

async function handleAuthLogin(formData) {
  const payload = {
    email: String(formData.get('email') || '').trim(),
    password: String(formData.get('password') || ''),
  };

  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Login failed.');
  }

  authRole = data.role || null;
  adminUser = data.role === 'admin' ? data.user || null : null;
  studentUser = data.role === 'student' ? data.user || null : null;
  notify(`Welcome, ${getSignedInUser()?.name || 'User'}.`);
  await fetchAnalytics();
  await fetchAuthState();
  window.location.hash = authRole === 'admin' ? '#admin' : '#dashboard';
  renderAll();
}

async function handleStudentRegister(formData) {
  const payload = {
    name: String(formData.get('name') || '').trim(),
    email: String(formData.get('email') || '').trim(),
    password: String(formData.get('password') || ''),
  };

  const response = await fetch('/api/students/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || 'Student registration failed.');
  }

  notify(data.message || 'Registration complete. Please log in.');
  await fetchAuthState();
  window.location.hash = '#auth';
  renderAll();
}

async function handleLogout() {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  adminUser = null;
  studentUser = null;
  authRole = null;
  notify('Session cleared.');
  await fetchAuthState();
  window.location.hash = '#auth';
  renderAll();
}

function handleFormSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) {
    return;
  }

  event.preventDefault();
  const mode = form.dataset.form;

  if (mode === 'auth-login') {
    handleAuthLogin(new FormData(form)).catch((error) => notify(error.message));
    return;
  }

  if (mode === 'student-register') {
    handleStudentRegister(new FormData(form)).catch((error) => notify(error.message));
    return;
  }

  if (mode === 'student-submission') {
    submitStudentExperience(new FormData(form));
    return;
  }

  if (mode === 'create-form') {
    upsertForm(new FormData(form));
    form.reset();
    elements.adminVolumeDefault.value = state.volumes[0]?.id || '';
    return;
  }

  if (mode === 'create-volume') {
    upsertVolume(new FormData(form));
    form.reset();
    return;
  }

  if (mode === 'edit-form') {
    upsertForm(new FormData(form), form.dataset.id);
    return;
  }

  if (mode === 'edit-volume') {
    upsertVolume(new FormData(form), form.dataset.id);
    return;
  }

  if (mode === 'edit-submission') {
    updateSubmission(form.dataset.id, new FormData(form));
  }
}

function handleClick(event) {
  const target = event.target instanceof HTMLElement ? event.target : null;
  if (!target) {
    return;
  }

  const button = target.closest('[data-action]');
  if (!button) {
    return;
  }

  const action = button.dataset.action;
  const id = button.dataset.id;

  if (action === 'open-experience') {
    showExperienceModal(id);
  }

  if (action === 'close-experience') {
    hideExperienceModal();
  }

  if (action === 'student-logout' || action === 'admin-logout' || action === 'logout-account') {
    handleLogout().catch((error) => notify(error.message));
  }

  if (action === 'delete-form') {
    deleteItem('forms', id, 'Form');
  }

  if (action === 'delete-volume') {
    deleteItem('volumes', id, 'Volume');
  }

  if (action === 'delete-submission') {
    deleteItem('submissions', id, 'Submission');
  }

  if (action === 'extend-form') {
    extendDeadline(id, Number(button.dataset.days || 7));
  }
}

function handleArchiveSearch(event) {
  archiveQuery = event.target.value;
  renderArchive();
}

async function fetchAnalytics() {
  try {
    const [visitorsRes, submissionsRes] = await Promise.all([
      fetch('/api/analytics/visitors', { credentials: 'include' }),
      fetch('/api/analytics/submissions', { credentials: 'include' }),
    ]);

    if (visitorsRes.ok) {
      const visitorsData = await visitorsRes.json();
      state.totalVisitors = visitorsData.totalVisitors;
      state.analyticsVisitors = visitorsData.dailyVisitors || [];
    }

    if (submissionsRes.ok) {
      const submissionsData = await submissionsRes.json();
      state.analyticsSubmissions = submissionsData || [];
    }
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
  }
}

function bootstrapDefaults() {
  if (!state.volumes.length) {
    state = defaultState();
    persist();
  }

  elements.adminVolumeDefault.value = state.volumes[0]?.id || '';
}

window.addEventListener('hashchange', () => {
  setActivePage();
});

window.addEventListener('DOMContentLoaded', () => {
  bootstrapDefaults();
  trackVisitor();
  fetchAnalytics();
  fetchAuthState().finally(() => renderAll());
  elements.archiveSearch.addEventListener('input', handleArchiveSearch);
  document.addEventListener('submit', handleFormSubmit);
  document.addEventListener('click', handleClick);

  if (!window.location.hash) {
    window.location.hash = '#home';
  }
});
