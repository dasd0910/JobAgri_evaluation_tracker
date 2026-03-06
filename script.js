/**
 * JobAgri Evaluation Tracker - Core Logic
 * Version: 3.0 (Sync Engine: Robust UTF-8 & Verbose Diagnostics)
 */

let currentIndex = 0;

// GitHub Sync State
const ghConfig = {
    username: localStorage.getItem('gh_username') || '',
    token: localStorage.getItem('gh_token') || '',
    repo: localStorage.getItem('gh_repo') || '',
    path: 'shared_data.json'
};

const init = () => {
    updateCountdown();
    renderTimelineDots();
    renderGantt();
    showMilestone(currentIndex);
    updateProgress();
    setupEventListeners();

    // Auto-detect current milestone based on today's date
    const today = new Date();
    const autoIndex = MILESTONES.findIndex(m => {
        const start = new Date(m.startDate);
        const end = new Date(m.endDate);
        return today >= start && today <= end;
    });

    if (autoIndex !== -1) {
        currentIndex = autoIndex;
        showMilestone(currentIndex);
    }

    setInterval(updateCountdown, 60000);
    loadSharedData(); // Initial load
};

const syncUI = () => {
    updateCountdown();
    renderTimelineDots();
    renderGantt();
    updateProgress();
};

const updateCountdown = () => {
    const deadline = new Date(PROJECT_DEADLINE);
    const today = new Date();
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const countdownEl = document.getElementById('main-countdown');
    if (!countdownEl) return;

    if (diffDays > 0) {
        countdownEl.textContent = `${diffDays} Days Left`;
    } else if (diffDays === 0) {
        countdownEl.textContent = "Deadline Today";
    } else {
        countdownEl.textContent = "Evaluation Period Ended";
    }
};

const renderTimelineDots = () => {
    const track = document.getElementById('milestone-dots');
    if (!track) return;
    track.innerHTML = '';

    MILESTONES.forEach((m, index) => {
        const dot = document.createElement('div');
        dot.className = `step-dot ${m.status}`;
        if (index === currentIndex) dot.classList.add('active');

        dot.title = m.title;
        dot.onclick = () => {
            currentIndex = index;
            showMilestone(currentIndex);
        };
        track.appendChild(dot);
    });
};

const renderGantt = () => {
    const gantt = document.getElementById('gantt-chart');
    if (!gantt) return;
    gantt.innerHTML = '';

    const startRange = new Date("2026-02-15");
    const endRange = new Date("2026-07-15");
    const totalDuration = endRange - startRange;

    MILESTONES.forEach((m, index) => {
        const row = document.createElement('div');
        row.className = 'gantt-row';

        const label = document.createElement('div');
        label.className = 'gantt-label';
        label.textContent = m.title;
        label.onclick = () => {
            currentIndex = index;
            showMilestone(currentIndex);
        };

        const track = document.createElement('div');
        track.className = 'gantt-track';

        const bar = document.createElement('div');
        bar.className = 'gantt-bar';
        if (index === currentIndex) bar.classList.add('active');

        const mStart = new Date(m.startDate);
        const mEnd = new Date(m.endDate);

        const left = ((mStart - startRange) / totalDuration) * 100;
        const width = ((mEnd - mStart) / totalDuration) * 100;

        bar.style.left = `${left}%`;
        bar.style.width = `${width}%`;

        track.appendChild(bar);
        row.appendChild(label);
        row.appendChild(track);
        gantt.appendChild(row);
    });
};

const renderSubSteps = (m) => {
    const list = document.getElementById('sub-steps-list');
    if (!list) return;
    list.innerHTML = '';

    if (!m.subSteps || m.subSteps.length === 0) {
        list.innerHTML = '<li class="sub-step-item">No sub-steps defined.</li>';
        return;
    }

    m.subSteps.forEach(step => {
        const item = document.createElement('li');
        item.className = `sub-step-item ${step.completed ? 'completed' : ''}`;

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = step.completed;
        checkbox.onchange = (e) => {
            step.completed = e.target.checked;
            item.classList.toggle('completed', step.completed);
            syncUI();
        };

        const text = document.createElement('span');
        text.textContent = step.text;

        item.appendChild(checkbox);
        item.appendChild(text);
        list.appendChild(item);
    });
};

const showMilestone = (index) => {
    const m = MILESTONES[index];
    if (!m) return;

    document.getElementById('current-step-num').textContent = `Step ${m.id} of 7`;
    document.getElementById('current-title').textContent = m.title;
    document.getElementById('current-desc').textContent = m.description;
    document.getElementById('current-owner').textContent = m.owner;
    document.getElementById('current-dates').textContent = `${formatDate(m.startDate)} - ${formatDate(m.endDate)}`;

    const statusSelect = document.getElementById('current-status-select');
    if (statusSelect) {
        statusSelect.value = m.status;
        statusSelect.className = 'status-select ' + m.status;
    }

    const notesBox = document.getElementById('current-notes');
    if (notesBox) {
        notesBox.textContent = m.notes || "";
        notesBox.onblur = (e) => {
            m.notes = e.target.textContent;
        };
    }

    renderSubSteps(m);
    syncUI();

    document.getElementById('prev-btn').disabled = index === 0;
    document.getElementById('next-btn').disabled = index === MILESTONES.length - 1;

    updateUrgency(m);
};

const updateUrgency = (m) => {
    const container = document.getElementById('urgency-container');
    const msgEl = document.getElementById('urgency-msg');
    if (!container || !msgEl) return;

    const today = new Date();
    const end = new Date(m.endDate);
    const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

    if (m.status === 'completed') {
        container.style.opacity = '0.5';
        msgEl.textContent = "Milestone successfully finalized.";
        container.classList.remove('urgent');
    } else if (diffDays < 0) {
        container.classList.add('urgent');
        msgEl.textContent = `OVERDUE by ${Math.abs(diffDays)} days.`;
    } else if (diffDays <= 7) {
        container.classList.add('urgent');
        msgEl.textContent = `CRITICAL: ${diffDays} days remaining.`;
    } else {
        container.classList.remove('urgent');
        msgEl.textContent = `${diffDays} days to complete this phase.`;
    }
};

const updateProgress = () => {
    const completed = MILESTONES.filter(m => m.status === 'completed').length;
    const percent = Math.round((completed / MILESTONES.length) * 100);

    const countEl = document.getElementById('completed-count');
    const labelEl = document.getElementById('percent-label');
    const fillEl = document.getElementById('overall-progress-fill');

    if (countEl) countEl.textContent = `${completed} of 7 Completed`;
    if (labelEl) labelEl.textContent = `${percent}%`;
    if (fillEl) fillEl.style.width = `${percent}%`;
};

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const downloadReport = () => {
    let csv = "Step,Milestone,Start Date,End Date,Status,Lead Owner,Sub-steps Progress,Management Notes\n";
    MILESTONES.forEach(m => {
        const completed = m.subSteps ? m.subSteps.filter(s => s.completed).length : 0;
        const total = m.subSteps ? m.subSteps.length : 0;
        const cleanNotes = (m.notes || "").replace(/[\n\r]/g, " ").replace(/"/g, '""');
        csv += `${m.id},"${m.title}",${m.startDate},${m.endDate},${m.status.toUpperCase()},"${m.owner}",${completed}/${total},"${cleanNotes}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `JobAgri_Report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
};

// --- SYNC ENGINE 3.0: ROBUST UTF-8 & VERBOSE DIAGNOSTICS ---

/**
 * Robust Base64 Encoding for UTF-8 (Safari/Mac Compatible)
 */
const toBase64 = (str) => {
    const bytes = new TextEncoder().encode(str);
    const binString = Array.from(bytes, byte => String.fromCharCode(byte)).join("");
    return btoa(binString);
};

const fromBase64 = (base64) => {
    const binString = atob(base64);
    const bytes = Uint8Array.from(binString, char => char.charCodeAt(0));
    return new TextDecoder().decode(bytes);
};

const logSync = (msg, isError = false) => {
    const consoleEl = document.getElementById('sync-status-console');
    if (!consoleEl) {
        console.log(`Sync Log: ${msg}`);
        return;
    }
    consoleEl.innerHTML = `> ${msg}`; // Use innerHTML to allow line breaks or specific styling
    consoleEl.className = `status-console ${isError ? 'error' : 'success'}`;
};

const githubReq = async (endpoint, method = 'GET', body = null) => {
    const url = `https://api.github.com/repos/${ghConfig.username}/${ghConfig.repo}/contents/${endpoint}`;
    const headers = {
        'Authorization': `token ${ghConfig.token}`,
        'Accept': 'application/vnd.github.v3+json'
    };

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const res = await fetch(url + (method === 'GET' ? `?t=${Date.now()}` : ''), options);

    if (!res.ok) {
        const err = await res.json();
        throw { status: res.status, message: err.message };
    }

    return await res.json();
};

const loadSharedData = async () => {
    if (!ghConfig.username || !ghConfig.token || !ghConfig.repo) return;

    try {
        logSync("Connecting...");
        const data = await githubReq(ghConfig.path);
        const content = JSON.parse(fromBase64(data.content));

        content.forEach(sharedM => {
            const localM = MILESTONES.find(m => m.id === sharedM.id);
            if (localM) {
                localM.status = sharedM.status;
                localM.notes = sharedM.notes;
                if (sharedM.subSteps) {
                    sharedM.subSteps.forEach(sharedS => {
                        const localS = localM.subSteps.find(s => s.id === sharedS.id);
                        if (localS) localS.completed = sharedS.completed;
                    });
                }
            }
        });
        showMilestone(currentIndex);
        syncUI();
        logSync(`Success: Shared updates loaded from ${ghConfig.repo}`);
    } catch (e) {
        if (e.status === 404) {
            logSync("Ready: No shared file found yet. Use 'Push' to create it.");
        } else {
            logSync(`Error ${e.status || ''}: ${e.message || "Connection failed"}`, true);
        }
    }
};

const pushToGitHub = async () => {
    // Sync current UI state to MILESTONES array
    const notesBox = document.getElementById('current-notes');
    if (notesBox) MILESTONES[currentIndex].notes = notesBox.textContent;

    if (!ghConfig.username || !ghConfig.token || !ghConfig.repo) {
        document.getElementById('sync-modal').classList.remove('hidden');
        return;
    }

    const btn = document.getElementById('sync-milestone-btn');
    const txt = document.getElementById('sync-text');
    btn.disabled = true;
    txt.innerText = "⏳ Saving...";

    try {
        logSync("Fetching current SHA...");
        let sha = null;
        try {
            const fileData = await githubReq(ghConfig.path);
            sha = fileData.sha;
        } catch (e) {
            if (e.status !== 404) throw e;
            logSync("Creating new shared file...");
        }

        const json = JSON.stringify(MILESTONES, null, 2);
        const body = {
            message: `Evaluation Update: ${MILESTONES[currentIndex].title}`,
            content: toBase64(json),
            sha: sha
        };

        logSync("Uploading payload...");
        await githubReq(ghConfig.path, 'PUT', body);

        txt.innerText = "✅ Saved Successfully";
        syncUI();
        logSync("Success: All updates are now global.");
        setTimeout(() => { txt.innerText = "Push Updates to GitHub"; btn.disabled = false; }, 3000);
    } catch (e) {
        txt.innerText = "❌ Save Failed";
        btn.disabled = false;
        logSync(`Sync Error: ${e.message || "Network Error"}`, true);
    }
};

const setupEventListeners = () => {
    document.getElementById('prev-btn').onclick = () => { if (currentIndex > 0) { currentIndex--; showMilestone(currentIndex); } };
    document.getElementById('next-btn').onclick = () => { if (currentIndex < MILESTONES.length - 1) { currentIndex++; showMilestone(currentIndex); } };

    const statusSelect = document.getElementById('current-status-select');
    if (statusSelect) {
        statusSelect.onchange = (e) => {
            MILESTONES[currentIndex].status = e.target.value;
            statusSelect.className = 'status-select ' + e.target.value;
            syncUI();
        };
    }

    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) exportBtn.onclick = downloadReport;

    document.getElementById('sync-milestone-btn').onclick = pushToGitHub;

    const syncModal = document.getElementById('sync-modal');
    document.getElementById('sync-settings-btn').onclick = () => syncModal.classList.remove('hidden');
    document.getElementById('close-sync-btn').onclick = () => syncModal.classList.add('hidden');

    document.getElementById('save-sync-btn').onclick = async () => {
        const user = document.getElementById('gh-username').value.trim();
        let repo = document.getElementById('gh-repo').value.trim();
        const token = document.getElementById('gh-token').value.trim();

        // Repo Name Sanitization: Extract from full URL if pasted
        if (repo.includes("github.com/")) {
            repo = repo.split("github.com/")[1].split("/")[1].replace(".git", "");
            document.getElementById('gh-repo').value = repo;
        }

        if (user && repo && token) {
            localStorage.setItem('gh_username', user);
            localStorage.setItem('gh_repo', repo);
            localStorage.setItem('gh_token', token);
            ghConfig.username = user;
            ghConfig.repo = repo;
            ghConfig.token = token;

            await loadSharedData();
            if (!document.getElementById('sync-status-console').classList.contains('error')) {
                setTimeout(() => syncModal.classList.add('hidden'), 2000);
            }
        } else {
            logSync("Please fill all fields.", true);
        }
    };

    document.getElementById('gh-username').value = ghConfig.username;
    document.getElementById('gh-repo').value = ghConfig.repo;
    document.getElementById('gh-token').value = ghConfig.token;
};

document.addEventListener('DOMContentLoaded', init);
