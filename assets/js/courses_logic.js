document.addEventListener("DOMContentLoaded", () => {
    if (typeof SCRAPED_COURSES === 'undefined') {
        console.error("SCRAPED_COURSES is not defined! Ensure scraped-courses.js is loaded.");
        return;
    }

    // Merge Dashboard Course Overrides & Newly Added Courses
    try {
        const localOverrides = JSON.parse(localStorage.getItem('sp_course_overrides') || '{}');
        const newCourses = JSON.parse(localStorage.getItem('sp_new_courses') || '[]');
        
        if (newCourses && newCourses.length > 0) {
            newCourses.forEach(nc => {
                const normClass = nc.class_name || nc.cls || 'General';
                const normItem = {
                    ...nc,
                    cls: normClass,
                    class_name: normClass,
                    school: nc.school || 'School Syllabus',
                    price: Number(nc.price) || 0,
                    img: nc.img || 'assets/images/studypack_logo.png',
                    inStock: nc.inStock !== false
                };
                const existingIdx = SCRAPED_COURSES.findIndex(c => c.id === normItem.id);
                if (existingIdx >= 0) {
                    SCRAPED_COURSES[existingIdx] = normItem;
                } else {
                    SCRAPED_COURSES.unshift(normItem);
                }
            });
        }

        if (Object.keys(localOverrides).length > 0) {
            SCRAPED_COURSES.forEach(c => {
                const ov = localOverrides[c.id];
                if (ov) {
                    if (ov.price !== undefined) c.price = ov.price;
                    if (ov.title !== undefined) c.title = ov.title;
                    if (ov.disabled !== undefined) c.disabled = ov.disabled;
                }
            });
        }
    } catch(e) { console.warn('Could not load course overrides:', e); }

    const schoolGrid = document.getElementById("schoolGrid");
    const classSelectorWrapper = document.getElementById("classSelectorWrapper");
    const selectedSchoolNameEl = document.getElementById("selectedSchoolName");
    const classPills = document.getElementById("classPills");
    const courseProductsContainer = document.getElementById("courseProductsContainer");
    const courseProductGrid = document.getElementById("courseProductGrid");
    const productSectionTitle = document.getElementById("productSectionTitle");

    // Extract unique schools
    const schools = [...new Set(SCRAPED_COURSES.map(c => c.school))];

    // Helper: generate initials
    const getInitials = (name) => {
        let parts = name.trim().split(" ");
        if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
        return (parts[0][0] + parts[parts.length-1][0]).toUpperCase();
    };

    // Render schools
    schools.forEach(school => {
        const div = document.createElement("div");
        div.className = "school-card reveal active-scale";
        const schoolDomains = {
            'Alpha High School': 'alpha.edu.pk',
            'Alpha Core School': 'alpha.edu.pk',
            'Alpha Girls School': 'alpha.edu.pk',
            'Alpha Prime School': 'alpha.edu.pk',
            'Dawood Public School': 'dps.edu.pk',
            'Beacon House School': 'beaconhouse.net',
            'The City School': 'thecityschool.edu.pk',
            'Aga Khan School': 'agakhanschools.org',
            'Fatimiyah School': 'fatimiyah.edu.pk',
            'Foundation Public School': 'fps.edu.pk',
            'Habib Girls School': 'habibschools.edu.pk',
            'Mama Parsi School': 'mamaparsi.edu.pk',
            'Karachi Public School': 'kps.edu.pk',
            'BVS': 'bvsparsi.edu.pk',
            'AMI School': 'amischool.edu.pk',
            'Head Start School': 'headstart.edu.pk',
            'Jaffar Public School': 'jps.edu.pk',
            'Meritorious School': 'meritorious.edu.pk',
            'Delsol': 'delsol.edu.pk',
            'Next School Cambridge': 'nextschool.edu.pk',
            'Next School Matric': 'nextschool.edu.pk',
            'Patriot': 'patriot.edu.pk',
            'Farv Cambridge': 'farv.edu.pk',
            'Kiva School': 'kiva.edu.pk',
            'Leader Harbor': 'leaderharbor.edu.pk',
            'Horizon School': 'horizon.edu.pk',
            'Horizon Hifz': 'horizon.edu.pk',
            'DEBS School': 'debs.edu.pk',
            'Angel World': 'angelworld.edu.pk',
            'DSS International': 'dss.edu.pk',
            'River Oaks': 'riveroaks.edu.pk',
            'Happy Home School Matric': 'hhs.edu.pk',
            "Happy Home School O'Level": 'hhs.edu.pk',
            'Al Khalil Academy School': 'alkhalil.edu.pk',
            'Aster School': 'aster.edu.pk',
            'The Educators': 'educators.edu.pk',
            'VLC - Humanities School': 'vlc.edu.pk'
        };

        // div already created above
        div.style.cursor = "pointer";

        const avatar = document.createElement("div");
        avatar.className = "school-avatar";
        
        const safeSchoolName = encodeURIComponent(school).replace(/'/g, "%27");
        const avatarFallback = `https://ui-avatars.com/api/?name=${safeSchoolName}&background=random&color=fff&size=128&bold=true`;
        
        avatar.style.background = 'transparent';
        avatar.style.boxShadow = 'none';
        avatar.innerHTML = `<img src="${avatarFallback}" alt="${school}" style="width:100%; height:100%; object-fit:cover; border-radius:50%;">`;

        const nameEl = document.createElement("div");
        nameEl.className = "school-name";
        nameEl.textContent = school;

        div.appendChild(avatar);
        div.appendChild(nameEl);

        div.addEventListener("click", () => {
            // Remove active from others
            document.querySelectorAll(".school-card").forEach(c => c.classList.remove("active"));
            div.classList.add("active");
            openSchool(school);
        });

        schoolGrid.appendChild(div);
    });

    let currentSchool = null;

    function openSchool(school) {
        currentSchool = school;
        selectedSchoolNameEl.textContent = `${school} Classes`;
        classSelectorWrapper.classList.add("visible");
        
        // Hide products until a class is selected
        courseProductsContainer.style.display = "none";
        
        // Find classes for this school
        const schoolCourses = SCRAPED_COURSES.filter(c => c.school === school);
        const classes = [...new Set(schoolCourses.map(c => c.class_name || c.cls || "General"))];
        const classOrder = {
            'Pre-Nursery': 1, 'Nursery': 2, 'Class KG': 3,
            'Class 1': 4, 'Class 2': 5, 'Class 3': 6, 'Class 4': 7, 'Class 5': 8,
            'Class 6': 9, 'Class 7': 10, 'Class 8': 11, 'Class 9': 12, 'Class 10': 13,
            'Class 11': 14, 'Class 12': 15, 'O-Level': 16, 'A-Level': 17, 'General': 18
        };
        classes.sort((a, b) => {
            const valA = classOrder[a] || 99;
            const valB = classOrder[b] || 99;
            return valA - valB;
        });

        classPills.innerHTML = "";
        
        if(classes.length === 0) {
            classPills.innerHTML = "<i>No classes found for this school.</i>";
            return;
        }

        classes.forEach(cls => {
            const btn = document.createElement("button");
            btn.className = "class-pill";
            btn.textContent = cls;
            btn.addEventListener("click", () => {
                document.querySelectorAll(".class-pill").forEach(p => p.classList.remove("active"));
                btn.classList.add("active");
                renderProducts(school, cls);
            });
            classPills.appendChild(btn);
        });
        
        // Auto select first class if there is one
        if(classPills.firstElementChild) {
            classPills.firstElementChild.click();
        }

        // Scroll to class selector
        classSelectorWrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    function renderProducts(school, cls) {
        productSectionTitle.textContent = `${school} - ${cls}`;
        courseProductsContainer.style.display = "block";
        courseProductGrid.innerHTML = "";

        const products = SCRAPED_COURSES.filter(c => c.school === school && (c.class_name === cls || c.cls === cls));

        if (products.length === 0) {
            courseProductGrid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <h3>No Books Found</h3>
                    <p>We couldn't find any books for this specific class.</p>
                </div>
            `;
            return;
        }

        products.forEach(p => {
            const card = document.createElement("div");
            card.className = "p-card fade-in";
            card.style.minWidth = "0";
            card.style.overflow = "hidden";
            card.setAttribute("data-id", p.id);
            
            let imgHtml = p.img 
                ? `<img src="${p.img}" alt="${p.title}" onerror="this.style.display='none'" style="width:100%; height:100%; object-fit:contain; border-radius:inherit; mix-blend-mode:multiply;">` 
                : `<div class="p-title" style="text-align:center;">${p.title}</div>`;
                
            let priceFormatted = typeof money === 'function' ? money(p.price) : 'Rs ' + p.price.toLocaleString();
                                
            card.innerHTML = `
                <div class="p-cover-wrap">
                  <div class="p-cover" style="background:${p.img ? '#fff' : 'var(--grey)'}; padding: ${p.img ? '0' : '10px'};">
                    <div class="quick-actions">
                      <button class="qa-btn" title="Wishlist" onclick="showToast('Added to wishlist')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg></button>
                      <button class="qa-btn" title="Quick View" onclick="openQuickView('${p.id}')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>
                    </div>
                    ${imgHtml}
                  </div>
                </div>
                <div class="p-meta" style="min-width:0;"><span>${p.class_name || 'Course'}</span><span>${p.school}</span></div>
                <div class="p-name">${p.title}</div>
                <div class="p-price-row">
                  <div class="p-price"><span class="now">${priceFormatted}</span></div>
                </div>
                <div class="p-actions" style="display:flex; flex-direction:column; gap:8px;">
                  <button class="btn-cart" onclick="addToCart('${p.id}')" style="width:100%; justify-content:center;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.7 13.4a2 2 0 0 0 2 1.6h9.7a2 2 0 0 0 2-1.6L23 6H6"/></svg> Add to Cart</button>
                </div>
            `;
            courseProductGrid.appendChild(card);
        });
        
        courseProductsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Export global so the inline onclick in HTML can use it
    window.closeSchool = function() {
        classSelectorWrapper.classList.remove("visible");
        courseProductsContainer.style.display = "none";
        document.querySelectorAll(".school-card").forEach(c => c.classList.remove("active"));
        currentSchool = null;
    };
});
