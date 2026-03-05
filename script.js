/**
 * JobAgri Evaluation Tracker - Core Logic
 */

let currentIndex = 0;

const updateCountdown = () => {
    const deadline = new Date(PROJECT_DEADLINE);
    const today = new Date();
    const diffTime = deadline - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const countdownEl = document.getElementById('main-countdown');
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
    gantt.innerHTML = '';

    // Calculate time range for the Gantt
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

        // Position based on dates
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
            updateProgress();
            renderTimelineDots();
            renderGantt();
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

    document.getElementById('current-step-num').textContent = `Step ${m.id} of 7`;
    document.getElementById('current-title').textContent = m.title;
    document.getElementById('current-desc').textContent = m.description;
    document.getElementById('current-owner').textContent = m.owner;
    document.getElementById('current-dates').textContent = `${formatDate(m.startDate)} - ${formatDate(m.endDate)}`;

    const statusEl = document.getElementById('current-status');
    statusEl.textContent = m.status.toUpperCase();
    statusEl.className = 'status-pill ' + 'status-' + m.status;

    // Notes
    const notesBox = document.getElementById('current-notes');
    notesBox.textContent = m.notes || "Add your status notes here...";
    notesBox.onblur = (e) => {
        m.notes = e.target.textContent;
    };

    renderSubSteps(m);
    renderGantt(); // Refresh highlighting

    // Update Dots
    const dots = document.querySelectorAll('.step-dot');
    dots.forEach((dot, i) => {
        dot.classList.remove('active');
        if (i === index) dot.classList.add('active');
    });

    // Update Nav Buttons
    document.getElementById('prev-btn').disabled = index === 0;
    document.getElementById('next-btn').disabled = index === MILESTONES.length - 1;

    updateUrgency(m);
};

const updateUrgency = (m) => {
    const container = document.getElementById('urgency-container');
    const msgEl = document.getElementById('urgency-msg');
    const today = new Date();
    const end = new Date(m.endDate);
    const diffDays = Math.ceil((end - today) / (1000 * 60 * 60 * 24));

    if (m.status === 'completed') {
        container.style.opacity = '0.5';
        msgEl.textContent = "Milestone successfully finalized.";
        container.classList.remove('urgent');
    } else if (diffDays < 0) {
        container.classList.add('urgent');
        msgEl.textContent = "This milestone is OVERDUE by " + Math.abs(diffDays) + " days.";
    } else if (diffDays <= 7) {
        container.classList.add('urgent');
        msgEl.textContent = "CRITICAL: " + diffDays + " days remaining for this phase.";
    } else {
        container.classList.remove('urgent');
        msgEl.textContent = "You have " + diffDays + " days to complete this phase.";
    }
};

const updateProgress = () => {
    const completed = MILESTONES.filter(m => m.status === 'completed').length;
    const percent = Math.round((completed / MILESTONES.length) * 100);

    document.getElementById('completed-count').textContent = `${completed} of 7 Completed`;
    document.getElementById('percent-label').textContent = `${percent}%`;
    document.getElementById('overall-progress-fill').style.width = `${percent}%`;
};

const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const downloadReport = () => {
    // Header for CSV
    let csv = "Step,Milestone,Start Date,End Date,Status,Lead Owner,Sub-steps Progress,Management Notes\n";

    MILESTONES.forEach(m => {
        const completedSubSteps = m.subSteps ? m.subSteps.filter(s => s.completed).length : 0;
        const totalSubSteps = m.subSteps ? m.subSteps.length : 0;
        const subStepsProgress = totalSubSteps > 0 ? `${completedSubSteps}/${totalSubSteps}` : "N/A";

        // Clean notes for CSV (remove newlines and quotes)
        const cleanNotes = (m.notes || "").replace(/[\n\r]/g, " ").replace(/"/g, '""');

        csv += `${m.id},"${m.title}",${m.startDate},${m.endDate},${m.status.toUpperCase()},"${m.owner}",${subStepsProgress},"${cleanNotes}"\n`;
    });

    // Create Blob and Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `JobAgri_Evaluation_Report_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// GitHub Sync State
const ghConfig = {
    username: localStorage.getItem('gh_username') || '',
    token: localStorage.getItem('gh_token') || '',
    repo: 'jobagri_tracker',
    path: 'shared_data.json'
};

const loadSharedData = async () => {
    if (!ghConfig.username || !ghConfig.token) return;

    try {
        const response = await fetch(`https://api.github.com/repos/${ghConfig.username}/${ghConfig.repo}/contents/${ghConfig.path}`, {
            headers: { 'Authorization': `token ${ghConfig.token}` }
        });

        if (response.ok) {
            const data = await response.json();
            const content = JSON.parse(atob(data.content));

            // Merge shared data into current MILESTONES
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
        }
    } catch (e) {
        console.warn("Shared data not found or inaccessible:", e);
    }
};

const pushToGitHub = async () => {
    if (!ghConfig.username || !ghConfig.token) {
        document.getElementById('sync-modal').classList.remove('hidden');
        return;
    }

    const syncBtn = document.getElementById('sync-milestone-btn');
    const syncText = document.getElementById('sync-text');
    syncBtn.disabled = true;
    syncText.innerText = "⏳ Syncing...";

    try {
        // 1. Get current file data (to get SHA)
        const getRes = await fetch(`https://api.github.com/repos/${ghConfig.username}/${ghConfig.repo}/contents/${ghConfig.path}`, {
            headers: { 'Authorization': `token ${ghConfig.token}` }
        });

        let sha = null;
        if (getRes.ok) {
            const fileData = await getRes.json();
            sha = fileData.sha;
        }

        // 2. Push updated data
        const body = {
            message: `Update evaluation notes: ${MILESTONES[currentIndex].title}`,
            content: btoa(JSON.stringify(MILESTONES, null, 2)),
            sha: sha
        };

        const putRes = await fetch(`https://api.github.com/repos/${ghConfig.username}/${ghConfig.repo}/contents/${ghConfig.path}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${ghConfig.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (putRes.ok) {
            syncText.innerText = "✅ Synced Successfully";
            setTimeout(() => { syncText.innerText = "Push Updates to GitHub"; syncBtn.disabled = false; }, 3000);
        } else {
            throw new Error("Failed to push");
        }
    } catch (e) {
        alert("Sync failed. Please check your token and repo permissions.");
        syncText.innerText = "❌ Sync Failed";
        syncBtn.disabled = false;
    }
};

const setupEventListeners = () => {
    // Navigation
    document.getElementById('prev-btn').onclick = () => {
        if (currentIndex > 0) {
            currentIndex--;
            showMilestone(currentIndex);
        }
    };

    document.getElementById('next-btn').onclick = () => {
        if (currentIndex < MILESTONES.length - 1) {
            currentIndex++;
            showMilestone(currentIndex);
        }
    };

    // Export
    const exportBtn = document.getElementById('export-btn');
    if (exportBtn) exportBtn.onclick = downloadReport;

    // Sync Actions
    document.getElementById('sync-milestone-btn').onclick = pushToGitHub;

    // Modal Management
    const syncModal = document.getElementById('sync-modal');
    document.getElementById('sync-settings-btn').onclick = () => syncModal.classList.remove('hidden');
    document.getElementById('close-sync-btn').onclick = () => syncModal.classList.add('hidden');

    document.getElementById('save-sync-btn').onclick = () => {
        const user = document.getElementById('gh-username').value.trim();
        const token = document.getElementById('gh-token').value.trim();

        if (user && token) {
            localStorage.setItem('gh_username', user);
            localStorage.setItem('gh_token', token);
            ghConfig.username = user;
            ghConfig.token = token;
            syncModal.classList.add('hidden');
            loadSharedData(); // Try initial fetch
        } else {
            alert("Please provide both username and token.");
        }
    };

    // Fill modal if values exist
    document.getElementById('gh-username').value = ghConfig.username;
    document.getElementById('gh-token').value = ghConfig.token;
};

const init = () => {
    updateCountdown();
    renderTimelineDots();
    renderGantt();
    showMilestone(currentIndex);
    updateProgress();
    setupEventListeners();

    // Auto-detect current milestone based on today's date if first time
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

    setInterval(updateCountdown, 60000); // Update countdown every minute
    loadSharedData(); // Load shared state from GitHub
};

document.addEventListener('DOMContentLoaded', init);
