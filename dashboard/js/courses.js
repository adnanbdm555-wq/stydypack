
function formatCourseImg(imgUrl, schoolName) {
    if (imgUrl && (imgUrl.startsWith('http://') || imgUrl.startsWith('https://'))) return imgUrl;
    if (imgUrl && imgUrl.startsWith('../')) return imgUrl;
    if (imgUrl && imgUrl.startsWith('assets/')) return '../' + imgUrl;
    if (imgUrl && imgUrl.startsWith('/')) return '..' + imgUrl;
    return getSchoolLogo(schoolName);
}

/* ============================================================
   School Syllabi & Course Packs Management Module (Dashboard)
   ============================================================ */

let currentCourses = [];
let selectedSchoolFilter = '';
let courseCurrentPage = 1;
const COURSES_PER_PAGE = 15;

window.initCoursesModule = function() {
    loadCoursesData();
};

function loadCoursesData() {
    let list = [];
    if (typeof SCRAPED_COURSES !== 'undefined' && Array.isArray(SCRAPED_COURSES)) {
        list = SCRAPED_COURSES.map(c => ({
            id: c.id || ('course_' + Math.random().toString(36).substr(2, 9)),
            title: c.title || 'School Course Set',
            school: c.school || 'School Syllabus',
            cls: c.cls || c.grade || 'General',
            price: Number(c.price) || 0,
            img: c.img || "",
            inStock: true
        }));
    }

    // Apply any local/Firestore overrides
    const localOverrides = JSON.parse(localStorage.getItem('sp_course_overrides') || '{}');
    list = list.map(item => {
        if (localOverrides[item.id]) {
            return { ...item, ...localOverrides[item.id] };
        }
        return item;
    });

    // Append newly created courses
    const newCourses = JSON.parse(localStorage.getItem('sp_new_courses') || '[]');
    currentCourses = newCourses.concat(list);
    
    renderSchoolPills();
    renderCoursesTable();
}

function renderSchoolPills() {
    const pillsContainer = document.getElementById('schoolFilterPills');
    if (!pillsContainer) return;

    // Extract unique schools
    const schools = [...new Set(currentCourses.map(c => c.school).filter(Boolean))].sort();

    pillsContainer.innerHTML = `
        <button class="pill-btn ${selectedSchoolFilter === '' ? 'active' : ''}" onclick="filterCoursesBySchool('')">
            All Schools (${currentCourses.length})
        </button>
        ${schools.map(s => {
            const count = currentCourses.filter(c => c.school === s).length;
            return `
            <button class="pill-btn ${selectedSchoolFilter === s ? 'active' : ''}" onclick="filterCoursesBySchool('${escapeHtml(s)}')">
                ${escapeHtml(s)} (${count})
            </button>`;
        }).join('')}
    `;
}

window.filterCoursesBySchool = function(schoolName) {
    selectedSchoolFilter = schoolName;
    courseCurrentPage = 1;
    renderSchoolPills();
    renderCoursesTable();
};

window.renderCourses = function() {
    loadCoursesData();
};

function renderCoursesTable() {
    const tbody = document.getElementById('coursesTbody');
    const paginationEl = document.getElementById('coursesPagination');
    if (!tbody) return;

    const searchInput = document.getElementById('courseSearch');
    const q = searchInput ? searchInput.value.toLowerCase().trim() : '';

    let filtered = currentCourses.filter(item => {
        if (selectedSchoolFilter && item.school !== selectedSchoolFilter) return false;
        if (q) {
            const fullStr = `${item.title} ${item.school} ${item.cls}`.toLowerCase();
            if (!fullStr.includes(q)) return false;
        }
        return true;
    });

    const total = filtered.length;
    const countEl = document.getElementById('totalCoursesCount');
    if (countEl) countEl.textContent = `${total} Course Sets`;

    const start = (courseCurrentPage - 1) * COURSES_PER_PAGE;
    const paginated = filtered.slice(start, start + COURSES_PER_PAGE);

    if (paginated.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding:3rem; color:var(--text-muted);">Koi course set nahi mila</td></tr>`;
        if (paginationEl) paginationEl.innerHTML = '';
        return;
    }

    tbody.innerHTML = paginated.map(item => {
        const courseImgSrc = formatCourseImg(item.img, item.school);
        return `
        <tr>
            <td>
                <div style="display:flex; align-items:center; gap:10px;">
                    <img src="${escapeHtml(courseImgSrc)}" style="width:36px; height:36px; border-radius:8px; object-fit:contain; background:#f8fafc; border:1px solid var(--border-color);" onerror="this.src='../assets/images/studypack_logo.png'">
                    <div>
                        <strong style="color:var(--text-main); font-size:13.5px;">${escapeHtml(item.title)}</strong>
                        <div style="font-size:11px; color:var(--text-muted);">${escapeHtml(item.school)}</div>
                    </div>
                </div>
            </td>
            <td><span class="badge" style="background:rgba(59,130,246,0.1); color:#3B82F6; font-weight:700;">${escapeHtml(item.school)}</span></td>
            <td><strong>${escapeHtml(item.cls)}</strong></td>
            <td><strong style="color:var(--gold); font-size:14px;">PKR ${Number(item.price).toLocaleString()}</strong></td>
            <td><span class="badge ${item.inStock !== false ? 'success' : 'danger'}">${item.inStock !== false ? 'In Stock' : 'Out of Stock'}</span></td>
            <td style="text-align:right;">
                <button class="icon-btn-sm" title="Edit Course" onclick="openEditCourseModal('${escapeHtml(item.id)}')"><i data-lucide="edit-3"></i></button>
                <button class="icon-btn-sm text-danger" title="Delete" onclick="deleteCourseItem('${escapeHtml(item.id)}')"><i data-lucide="trash-2"></i></button>
            </td>
        </tr>`;
    }).join('');

    renderCoursePagination(total, paginationEl);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function getSchoolLogo(schoolName) {
    if (!schoolName) return '../assets/images/studypack_logo.png';
    const s = schoolName.toLowerCase();
    if (s.includes('beaconhouse')) return '../assets/images/schools/Beacon House School.png';
    if (s.includes('city school')) return '../assets/images/schools/The City School.png';
    if (s.includes('educator')) return '../assets/images/schools/The Educators.png';
    if (s.includes('foundation')) return '../assets/images/schools/Foundation Public School.png';
    if (s.includes('habib')) return '../assets/images/schools/Habib Girls School.png';
    if (s.includes('mama parsi')) return '../assets/images/schools/Mama Parsi School.png';
    if (s.includes('aga khan')) return '../assets/images/schools/Aga Khan School.jpg';
    if (s.includes('karachi public')) return '../assets/images/schools/Karachi Public School.jpg';
    if (s.includes('dawood')) return '../assets/images/schools/Dawood Public School.jpg';
    if (s.includes('happy home')) return '../assets/images/schools/Happy Home School Matric.jpg';
    if (s.includes('bvs')) return '../assets/images/schools/BVS.png';
    if (s.includes('ami')) return '../assets/images/schools/AMI School.png';
    if (s.includes('delsol')) return '../assets/images/schools/Delsol.png';
    if (s.includes('river oaks')) return '../assets/images/schools/River Oaks.jpg';
    return '../assets/images/studypack_logo.png';
}

function renderCoursePagination(total, container) {
    if (!container) return;
    const pages = Math.ceil(total / COURSES_PER_PAGE);
    if (pages <= 1) { container.innerHTML = ''; return; }

    let html = `<button ${courseCurrentPage === 1 ? 'disabled' : ''} onclick="changeCoursePage(${courseCurrentPage - 1})">Prev</button>`;
    
    for (let p = 1; p <= pages; p++) {
        if (p === 1 || p === pages || (p >= courseCurrentPage - 2 && p <= courseCurrentPage + 2)) {
            html += `<button class="${p === courseCurrentPage ? 'active' : ''}" onclick="changeCoursePage(${p})">${p}</button>`;
        } else if (p === courseCurrentPage - 3 || p === courseCurrentPage + 3) {
            html += `<span>...</span>`;
        }
    }

    html += `<button ${courseCurrentPage === pages ? 'disabled' : ''} onclick="changeCoursePage(${courseCurrentPage + 1})">Next</button>`;
    container.innerHTML = html;
}

window.changeCoursePage = function(page) {
    courseCurrentPage = page;
    renderCoursesTable();
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// Search listener
document.addEventListener('DOMContentLoaded', () => {
    const searchInput = document.getElementById('courseSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            courseCurrentPage = 1;
            renderCoursesTable();
        });
    }
});

// Modal Open/Save Handlers
window.openAddCourseModal = function() {
    const modal = document.getElementById('courseModal');
    if (!modal) return;
    document.getElementById('courseModalTitle').textContent = 'Add School Course Pack';
    document.getElementById('courseForm').reset();
    document.getElementById('courseDocId').value = '';
    document.getElementById('courseImg').value = '';
    document.getElementById('courseImgPreview').src = '../assets/images/studypack_logo.png';
    document.getElementById('courseImgFile').value = '';
    modal.classList.add('show');
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.openEditCourseModal = function(courseId) {
    const item = currentCourses.find(c => c.id === courseId);
    if (!item) return;

    const modal = document.getElementById('courseModal');
    if (!modal) return;

    document.getElementById('courseModalTitle').textContent = 'Edit Course Pack';
    document.getElementById('courseDocId').value = item.id;
    document.getElementById('courseTitle').value = item.title || '';
    document.getElementById('courseSchool').value = item.school || '';
    document.getElementById('courseClass').value = item.cls || '';
    document.getElementById('coursePrice').value = item.price || 0;
    document.getElementById('courseStock').value = item.inStock !== false ? 'true' : 'false';
    document.getElementById('courseImg').value = item.img || '';
    document.getElementById('courseImgPreview').src = formatCourseImg(item.img, item.school);
    document.getElementById('courseImgFile').value = '';

    modal.classList.add('show');
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.closeCourseModal = function() {
    const modal = document.getElementById('courseModal');
    if (modal) modal.classList.remove('show');
};

window.saveCourseForm = async function(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const originalText = btn ? btn.textContent : 'Save Course Pack';
    if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

    try {
        const id = document.getElementById('courseDocId').value;
        const title = document.getElementById('courseTitle').value.trim();
        const school = document.getElementById('courseSchool').value.trim();
        const cls = document.getElementById('courseClass').value.trim();
        const price = Number(document.getElementById('coursePrice').value) || 0;
        const inStock = document.getElementById('courseStock').value === 'true';
        let img = document.getElementById('courseImg').value;

        const fileInput = document.getElementById('courseImgFile');
        if (fileInput && fileInput.files.length > 0) {
            if (btn) btn.textContent = 'Uploading Cover Image...';
            const file = fileInput.files[0];
            const formData = new FormData();
            formData.append('image', file);
            const imgBB_API_KEY = 'f14a4449997d84ded74a12b023bc2a02';
            const response = await fetch(`https://api.imgbb.com/1/upload?key=${imgBB_API_KEY}`, { method: 'POST', body: formData });
            const result = await response.json();
            if (result.success) img = result.data.url;
        }

        if (id) {
            const localOverrides = JSON.parse(localStorage.getItem('sp_course_overrides') || '{}');
            localOverrides[id] = { title, school, cls, class_name: cls, price, img, inStock };
            localStorage.setItem('sp_course_overrides', JSON.stringify(localOverrides));
            showToast('Course pack updated with new cover image!');
        } else {
            const newId = 'course_custom_' + Date.now();
            const newCourses = JSON.parse(localStorage.getItem('sp_new_courses') || '[]');
            newCourses.unshift({
                id: newId,
                title,
                school,
                cls,
                class_name: cls,
                price,
                img: img || getSchoolLogo(school),
                inStock
            });
            localStorage.setItem('sp_new_courses', JSON.stringify(newCourses));
            showToast('New course pack published with cover image!');
        }

        closeCourseModal();
        loadCoursesData();
    } catch(err) {
        showToast('Error saving course: ' + err.message, 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.textContent = originalText; }
    }
};

window._saveCourseFormOld = function(e) {

    if (id) {
        // Edit existing
        const localOverrides = JSON.parse(localStorage.getItem('sp_course_overrides') || '{}');
        localOverrides[id] = { title, school, cls, price, inStock };
        localStorage.setItem('sp_course_overrides', JSON.stringify(localOverrides));
        showToast('Course pack updated successfully!');
    } else {
        // Add new
        const newId = 'course_custom_' + Date.now();
        const newCourses = JSON.parse(localStorage.getItem('sp_new_courses') || '[]');
        newCourses.unshift({
            id: newId,
            title,
            school,
            cls,
            class_name: cls,
            price,
            img: getSchoolLogo(school),
            inStock
        });
        localStorage.setItem('sp_new_courses', JSON.stringify(newCourses));
        showToast('New course pack added and published to store!');
    }

    closeCourseModal();
    loadCoursesData();
};

window.deleteCourseItem = function(id) {
    if (!confirm('Kya aap waqai is course set ko delete karna chahte hain?')) return;
    
    // Check if in new courses
    let newCourses = JSON.parse(localStorage.getItem('sp_new_courses') || '[]');
    newCourses = newCourses.filter(c => c.id !== id);
    localStorage.setItem('sp_new_courses', JSON.stringify(newCourses));

    // Or mark in overrides
    const localOverrides = JSON.parse(localStorage.getItem('sp_course_overrides') || '{}');
    localOverrides[id] = { deleted: true };
    localStorage.setItem('sp_course_overrides', JSON.stringify(localOverrides));

    currentCourses = currentCourses.filter(c => c.id !== id);
    renderCoursesTable();
    showToast('Course pack removed');
};

// Bulk Price Increase for Courses Modal
window.openCourseBulkPriceModal = function() {
    const modal = document.getElementById('courseBulkPriceModal');
    if (!modal) return;
    modal.classList.add('show');
};

window.closeCourseBulkPriceModal = function() {
    const modal = document.getElementById('courseBulkPriceModal');
    if (modal) modal.classList.remove('show');
};

window.applyCourseBulkPrice = function(e) {
    e.preventDefault();
    const targetSchool = document.getElementById('bulkSchoolSelect').value;
    const percent = Number(document.getElementById('bulkCoursePercent').value) || 0;
    const actionType = document.getElementById('bulkCourseAction').value; // 'inc' or 'dec'

    if (percent === 0) {
        alert('Please enter a percentage value greater than 0');
        return;
    }

    const multiplier = actionType === 'inc' ? (1 + percent / 100) : (1 - percent / 100);
    const localOverrides = JSON.parse(localStorage.getItem('sp_course_overrides') || '{}');

    let count = 0;
    currentCourses.forEach(item => {
        if (!targetSchool || item.school === targetSchool) {
            const newPrice = Math.round(Number(item.price || 0) * multiplier);
            localOverrides[item.id] = { ...(localOverrides[item.id] || {}), price: newPrice };
            item.price = newPrice;
            count++;
        }
    });

    localStorage.setItem('sp_course_overrides', JSON.stringify(localOverrides));
    closeCourseBulkPriceModal();
    renderCoursesTable();
    showToast(`Prices updated for ${count} course packs (${actionType === 'inc' ? '+' : '-'}${percent}%)!`);
};

// ============================================================
// ADD MORE INDIVIDUAL COURSE BOOKS HANDLERS
// ============================================================

window.openAddCourseBookModal = function() {
    const modal = document.getElementById('courseBookModal');
    if (!modal) return;
    document.getElementById('courseBookForm')?.reset();
    if (selectedSchoolFilter) {
        const schInput = document.getElementById('bookSchoolInput');
        if (schInput) schInput.value = selectedSchoolFilter;
    }
    modal.classList.add('show');
    if (typeof lucide !== 'undefined') lucide.createIcons();
};

window.closeCourseBookModal = function() {
    const modal = document.getElementById('courseBookModal');
    if (modal) modal.classList.remove('show');
};

window.saveCourseBookForm = function(e) {
    e.preventDefault();
    const school = document.getElementById('bookSchoolInput').value.trim();
    const cls = document.getElementById('bookClassSelect').value.trim();
    const rawTitles = document.getElementById('bookTitlesTextarea').value.trim();
    const price = Number(document.getElementById('bookUnitPrice').value) || 0;
    const inStock = document.getElementById('bookStockSelect').value === 'true';

    if (!school || !rawTitles) {
        showToast('Please fill all required fields', 'error');
        return;
    }

    const lines = rawTitles.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length === 0) return;

    const newCourses = JSON.parse(localStorage.getItem('sp_new_courses') || '[]');
    
    lines.forEach((lineTitle, idx) => {
        const itemPrice = price;
        const newId = 'cb_' + Date.now() + '_' + idx;
        newCourses.unshift({
            id: newId,
            title: lineTitle,
            school: school,
            cls: cls,
            class_name: cls,
            price: itemPrice,
            img: getSchoolLogo(school),
            inStock: inStock,
            type: 'course_book'
        });
    });

    localStorage.setItem('sp_new_courses', JSON.stringify(newCourses));
    showToast(`Successfully added ${lines.length} book(s) to ${school}!`);
    closeCourseBookModal();
    loadCoursesData();
};


document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('courseImgFile')?.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (evt) => {
            const prev = document.getElementById('courseImgPreview');
            if (prev) prev.src = evt.target.result;
        };
        reader.readAsDataURL(file);
    });
});
