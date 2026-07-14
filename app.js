/**
 * SiNilai - Main Application Logic (Google Sheets Production Edition)
 */

document.addEventListener("DOMContentLoaded", () => {
  // Clear all localStorage data to ensure no academic records or settings are stored on browser
  localStorage.clear();

  // Constants
  const defaultAvatar = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%236366F1'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/></svg>";

  const gradeWeights = {
    "A": 4.0,
    "B+": 3.5,
    "B": 3.0,
    "C+": 2.5,
    "C": 2.0,
    "D": 1.0,
    "E": 0.0
  };

  // State Management
  let currentUser = null;
  let activeView = "dashboard";

  // Cache DOM Elements
  const elLoginView = document.getElementById("login-view");
  const elAppView = document.getElementById("app-view");
  
  const elLoginForm = document.getElementById("login-form");
  const elLoginUsername = document.getElementById("login-username");
  const elLoginPassword = document.getElementById("login-password");
  const elLoginAlert = document.getElementById("login-alert");

  const elSidebarUserPhoto = document.getElementById("sidebar-user-photo");
  const elSidebarUserName = document.getElementById("sidebar-user-name");
  const elSidebarUserRole = document.getElementById("sidebar-user-role");

  const elMenuAdminSection = document.getElementById("menu-admin-section");
  const elMenuDosenSection = document.getElementById("menu-dosen-section");
  const elMenuMahasiswaSection = document.getElementById("menu-mahasiswa-section");

  const elMenuItems = document.querySelectorAll(".menu-item");
  const elContentViews = document.querySelectorAll(".content-view");

  const elLoadingOverlay = document.getElementById("loading-overlay");
  const elLoadingText = document.getElementById("loading-text");
  const elToast = document.getElementById("toast");
  const elToastMessage = document.getElementById("toast-message");

  // ==========================================
  // VIEW ROUTER
  // ==========================================
  function showView(viewId) {
    activeView = viewId;
    
    // Hide all views
    elContentViews.forEach(view => {
      view.classList.add("hidden");
    });
    
    // Show selected view
    const targetView = document.getElementById(`view-${viewId}`);
    if (targetView) {
      targetView.classList.remove("hidden");
    }

    // Update active class on sidebar menu items
    elMenuItems.forEach(item => {
      if (item.getAttribute("data-view") === viewId) {
        item.classList.add("active");
      } else {
        item.classList.remove("active");
      }
    });

    // Refresh view specific data
    refreshViewData(viewId);
  }

  function refreshViewData(viewId) {
    switch (viewId) {
      case "dashboard":
        loadDashboardStats();
        break;
      case "master-matkul":
        loadCoursesView();
        break;
      case "data-dosen":
        loadDosensTable();
        break;
      case "data-mahasiswa":
        loadStudentsTable();
        break;
      case "dosen-profile":
        loadDosenProfile();
        break;
      case "input-nilai":
        loadGradesView();
        break;
      case "student-dashboard":
        loadStudentDashboard();
        break;
      case "settings":
        loadSettingsView();
        break;
    }
  }

  // ==========================================
  // UTILITIES (LOADING & TOAST)
  // ==========================================
  function setLoader(show, text = "Memproses data...") {
    if (show) {
      elLoadingText.textContent = text;
      elLoadingOverlay.classList.remove("hidden");
    } else {
      elLoadingOverlay.classList.add("hidden");
    }
  }

  function showToast(message, type = "success") {
    elToastMessage.textContent = message;
    
    const icon = elToast.querySelector("i");
    if (type === "error") {
      icon.className = "fa-solid fa-circle-exclamation";
      elToast.style.backgroundColor = "#ef4444";
    } else {
      icon.className = "fa-solid fa-circle-check";
      elToast.style.backgroundColor = "#10b981";
    }
    
    elToast.classList.remove("hidden");
    setTimeout(() => {
      elToast.classList.add("hidden");
    }, 3000);
  }

  // ==========================================
  // AUTHENTICATION LOGIC
  // ==========================================
  function checkSession() {
    const sessionData = sessionStorage.getItem("sinilai_user");
    if (sessionData) {
      currentUser = JSON.parse(sessionData);
      loginSuccess(currentUser);
    } else {
      // Show login screen directly
      elLoginUsername.value = "";
      elLoginPassword.value = "";
      elLoginAlert.classList.add("hidden");
      
      elLoginView.classList.remove("hidden");
      elAppView.classList.add("hidden");
      currentUser = null;
    }
  }

  function loginSuccess(user) {
    elLoginView.classList.add("hidden");
    elAppView.classList.remove("hidden");
    
    // Set Sidebar User Info
    elSidebarUserPhoto.src = user.photoUrl || defaultAvatar;
    elSidebarUserName.textContent = user.name;
    
    // Configure layout by Role (adm, dsn, mhs)
    if (user.role === "adm") {
      elSidebarUserRole.textContent = "Administrator";
      elMenuAdminSection.classList.remove("hidden");
      elMenuDosenSection.classList.add("hidden");
      elMenuMahasiswaSection.classList.add("hidden");
      
      showView("dashboard");
    } else if (user.role === "dsn") {
      elSidebarUserRole.textContent = "Dosen Pengampu";
      elMenuAdminSection.classList.add("hidden");
      elMenuDosenSection.classList.remove("hidden");
      elMenuMahasiswaSection.classList.add("hidden");
      
      showView("dosen-profile");
    } else {
      elSidebarUserRole.textContent = `Mahasiswa`;
      elMenuAdminSection.classList.add("hidden");
      elMenuDosenSection.classList.add("hidden");
      elMenuMahasiswaSection.classList.remove("hidden");
      
      showView("student-dashboard");
    }
  }

  // User Login Form Handler
  elLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    elLoginAlert.classList.add("hidden");
    setLoader(true, "Memverifikasi Kredensial...");
    
    const username = elLoginUsername.value.trim();
    const password = elLoginPassword.value;
    
    try {
      const res = await AcademicAPI.login(username, password);
      if (res.success) {
        sessionStorage.setItem("sinilai_user", JSON.stringify(res.user));
        currentUser = res.user;
        loginSuccess(currentUser);
        showToast("Login berhasil! Selamat datang.");
      } else {
        elLoginAlert.textContent = res.message || "ID Pengguna atau Kata Sandi salah.";
        elLoginAlert.classList.remove("hidden");
      }
    } catch (err) {
      elLoginAlert.textContent = "Gagal menghubungi database: " + err.message;
      elLoginAlert.classList.remove("hidden");
    } finally {
      setLoader(false);
    }
  });

  // Logout Button Handler
  document.getElementById("btn-logout").addEventListener("click", () => {
    sessionStorage.removeItem("sinilai_user");
    checkSession();
    showToast("Anda telah keluar dari sistem.");
  });

  // ==========================================
  // VIEW: ADMIN DASHBOARD ACTIONS
  // ==========================================
  async function loadDashboardStats() {
    try {
      const res = await AcademicAPI.getDashboardStats();
      if (res.success) {
        document.getElementById("stat-total-mhs").textContent = res.stats.totalStudents;
        document.getElementById("stat-total-matkul").textContent = res.stats.totalCourses;
        document.getElementById("stat-total-nilai").textContent = res.stats.totalGrades;
      }
    } catch (err) {
      console.error("Gagal memuat statistik dashboard:", err);
    }
  }

  // ==========================================
  // VIEW: DATA DOSEN ACTIONS (ADMIN ONLY)
  // ==========================================
  const elFormDosen = document.getElementById("form-dosen");
  const elTableDosensBody = document.querySelector("#table-dosens tbody");

  async function loadDosensTable() {
    elTableDosensBody.innerHTML = `<tr><td colspan="3" class="text-center">Memuat data...</td></tr>`;
    try {
      const res = await AcademicAPI.getDosens();
      if (res.success && res.dosens.length > 0) {
        elTableDosensBody.innerHTML = "";
        res.dosens.forEach(d => {
          const row = document.createElement("tr");
          const photo = d.photoUrl ? d.photoUrl : defaultAvatar;
          row.innerHTML = `
            <td><img class="table-user-thumb" src="${photo}" alt="Lecturer Thumb" onerror="this.src='${defaultAvatar}'"></td>
            <td><strong>${escapeHTML(d.nidn)}</strong></td>
            <td>${escapeHTML(d.name)}</td>
          `;
          elTableDosensBody.appendChild(row);
        });
      } else {
        elTableDosensBody.innerHTML = `<tr><td colspan="3" class="text-center">Belum ada dosen terdaftar.</td></tr>`;
      }
    } catch (err) {
      elTableDosensBody.innerHTML = `<tr><td colspan="3" class="text-center text-danger">Gagal memuat dosen: ${err.message}</td></tr>`;
    }
  }

  if (elFormDosen) {
    elFormDosen.addEventListener("submit", async (e) => {
      e.preventDefault();
      setLoader(true, "Menyimpan Data Dosen...");
      
      const nidn = document.getElementById("dosen-nidn").value.trim();
      const pass = document.getElementById("dosen-password").value;
      const name = document.getElementById("dosen-name").value.trim();
      const photo = document.getElementById("dosen-photo").value.trim();
      
      try {
        const res = await AcademicAPI.addDosen(nidn, pass, name, photo);
        if (res.success) {
          showToast("Data Dosen baru berhasil disimpan!");
          elFormDosen.reset();
          document.getElementById("dosen-password").value = "dsn123";
          loadDosensTable();
        } else {
          showToast(res.message || "Gagal menyimpan data dosen.", "error");
        }
      } catch (err) {
        showToast("Error: " + err.message, "error");
      } finally {
        setLoader(false);
      }
    });
  }

  // ==========================================
  // VIEW: DATA MAHASISWA ACTIONS (ADMIN ONLY)
  // ==========================================
  const elFormStudent = document.getElementById("form-student");
  const elTableStudentsBody = document.querySelector("#table-students tbody");

  async function loadStudentsTable() {
    elTableStudentsBody.innerHTML = `<tr><td colspan="4" class="text-center">Memuat data...</td></tr>`;
    try {
      const res = await AcademicAPI.getStudents();
      if (res.success && res.students.length > 0) {
        elTableStudentsBody.innerHTML = "";
        res.students.forEach(s => {
          const row = document.createElement("tr");
          const photo = s.photoUrl ? s.photoUrl : defaultAvatar;
          row.innerHTML = `
            <td><img class="table-user-thumb" src="${photo}" alt="Student Thumb" onerror="this.src='${defaultAvatar}'"></td>
            <td><strong>${escapeHTML(s.nim)}</strong></td>
            <td>${escapeHTML(s.name)}</td>
            <td>${escapeHTML(s.major)}</td>
          `;
          elTableStudentsBody.appendChild(row);
        });
      } else {
        elTableStudentsBody.innerHTML = `<tr><td colspan="4" class="text-center">Belum ada mahasiswa terdaftar.</td></tr>`;
      }
    } catch (err) {
      elTableStudentsBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Gagal memuat mahasiswa: ${err.message}</td></tr>`;
    }
  }

  if (elFormStudent) {
    elFormStudent.addEventListener("submit", async (e) => {
      e.preventDefault();
      setLoader(true, "Menyimpan Profil Mahasiswa...");
      
      const nim = document.getElementById("student-nim").value.trim();
      const pass = document.getElementById("student-password").value;
      const name = document.getElementById("student-name").value.trim();
      const major = document.getElementById("student-major").value.trim();
      const photo = document.getElementById("student-photo").value.trim();
      
      try {
        const res = await AcademicAPI.addStudent(nim, pass, name, major, photo);
        if (res.success) {
          showToast("Mahasiswa baru berhasil disimpan!");
          elFormStudent.reset();
          document.getElementById("student-password").value = "mhs123";
          loadStudentsTable();
        } else {
          showToast(res.message || "Gagal menyimpan data mahasiswa.", "error");
        }
      } catch (err) {
        showToast("Error: " + err.message, "error");
      } finally {
        setLoader(false);
      }
    });
  }

  // ==========================================
  // VIEW: MASTER MATAKULIAH ACTIONS (ADMIN ONLY)
  // ==========================================
  const elFormCourse = document.getElementById("form-course");
  const elCourseLecturerSelect = document.getElementById("course-lecturer-select");
  const elTableCoursesBody = document.querySelector("#table-courses tbody");

  async function loadCoursesView() {
    elTableCoursesBody.innerHTML = `<tr><td colspan="4" class="text-center">Memuat data...</td></tr>`;
    
    // Populate Dosen Dropdown
    if (elCourseLecturerSelect) {
      elCourseLecturerSelect.innerHTML = `<option value="">-- Pilih Dosen --</option>`;
      try {
        const resDsn = await AcademicAPI.getDosens();
        if (resDsn.success) {
          resDsn.dosens.forEach(d => {
            const opt = document.createElement("option");
            opt.value = d.name;
            opt.textContent = `${d.nidn} - ${d.name}`;
            elCourseLecturerSelect.appendChild(opt);
          });
        }
      } catch (e) {
        console.error(e);
      }
    }

    // Populate Courses Table
    try {
      const res = await AcademicAPI.getCourses();
      if (res.success && res.courses.length > 0) {
        elTableCoursesBody.innerHTML = "";
        res.courses.forEach(c => {
          const row = document.createElement("tr");
          row.innerHTML = `
            <td><strong>${escapeHTML(c.courseCode)}</strong></td>
            <td>${escapeHTML(c.courseName)}</td>
            <td class="sks-cell">${c.sks} SKS</td>
            <td>${escapeHTML(c.lecturer)}</td>
          `;
          elTableCoursesBody.appendChild(row);
        });
      } else {
        elTableCoursesBody.innerHTML = `<tr><td colspan="4" class="text-center">Belum ada mata kuliah terdaftar.</td></tr>`;
      }
    } catch (err) {
      elTableCoursesBody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">Gagal memuat mata kuliah: ${err.message}</td></tr>`;
    }
  }

  if (elFormCourse) {
    elFormCourse.addEventListener("submit", async (e) => {
      e.preventDefault();
      setLoader(true, "Menyimpan Mata Kuliah...");
      
      const code = document.getElementById("course-code").value.trim().toUpperCase();
      const name = document.getElementById("course-name").value.trim();
      const sks = parseInt(document.getElementById("course-sks").value);
      const lecturer = elCourseLecturerSelect.value;
      
      try {
        const res = await AcademicAPI.addCourse(code, name, sks, lecturer);
        if (res.success) {
          showToast("Mata kuliah berhasil disimpan!");
          elFormCourse.reset();
          loadCoursesView();
        } else {
          showToast(res.message || "Gagal menyimpan mata kuliah.", "error");
        }
      } catch (err) {
        showToast("Error: " + err.message, "error");
      } finally {
        setLoader(false);
      }
    });
  }

  // ==========================================
  // VIEW: LECTURER (DOSEN) PROFILE ACTIONS
  // ==========================================
  const elDosenDisplayPhoto = document.getElementById("dosen-display-photo");
  const elDosenDisplayName = document.getElementById("dosen-display-name");
  const elDosenDisplayNidn = document.getElementById("dosen-display-nidn");
  const elDosenDisplayCoursesCount = document.getElementById("dosen-display-courses-count");
  const elTableDosenCoursesBody = document.querySelector("#table-dosen-courses tbody");

  async function loadDosenProfile() {
    if (!currentUser) return;
    
    elDosenDisplayPhoto.src = currentUser.photoUrl || defaultAvatar;
    elDosenDisplayName.textContent = currentUser.name;
    elDosenDisplayNidn.textContent = currentUser.username;
    
    elTableDosenCoursesBody.innerHTML = `<tr><td colspan="3" class="text-center">Memuat matakuliah...</td></tr>`;
    
    try {
      const res = await AcademicAPI.getCourses();
      if (res.success) {
        const myCourses = res.courses.filter(c => c.lecturer.toLowerCase().trim() === currentUser.name.toLowerCase().trim());
        
        elDosenDisplayCoursesCount.textContent = myCourses.length;
        
        if (myCourses.length > 0) {
          elTableDosenCoursesBody.innerHTML = "";
          myCourses.forEach(c => {
            const row = document.createElement("tr");
            row.innerHTML = `
              <td><strong>${escapeHTML(c.courseCode)}</strong></td>
              <td>${escapeHTML(c.courseName)}</td>
              <td class="sks-cell">${c.sks} SKS</td>
            `;
            elTableDosenCoursesBody.appendChild(row);
          });
        } else {
          elTableDosenCoursesBody.innerHTML = `<tr><td colspan="3" class="text-center">Anda belum ditunjuk untuk mengampu mata kuliah apapun.</td></tr>`;
        }
      }
    } catch (err) {
      elTableDosenCoursesBody.innerHTML = `<tr><td colspan="3" class="text-center text-danger">Gagal memuat mata kuliah: ${err.message}</td></tr>`;
    }
  }

  // ==========================================
  // VIEW: INPUT NILAI ACTIONS (DOSEN ONLY)
  // ==========================================
  const elFormGrade = document.getElementById("form-grade");
  const elGradeNimSelect = document.getElementById("grade-nim");
  const elGradePlaceholder = document.getElementById("grade-placeholder");
  const elGradeInputSection = document.getElementById("grade-input-section");
  const elGradeCoursesList = document.getElementById("grade-courses-list");
  const elGradePreviewSks = document.getElementById("grade-preview-sks");
  const elGradePreviewGpa = document.getElementById("grade-preview-gpa");
  const elTableGradesBody = document.querySelector("#table-grades tbody");

  async function loadGradesView() {
    if (!currentUser) return;
    
    elGradePlaceholder.classList.remove("hidden");
    elGradeInputSection.classList.add("hidden");
    elGradeCoursesList.innerHTML = "";
    elGradePreviewSks.textContent = "0 SKS";
    elGradePreviewGpa.textContent = "0.00";
    
    elTableGradesBody.innerHTML = `<tr><td colspan="5" class="text-center">Memuat data...</td></tr>`;
    
    // Populate students list dropdown
    elGradeNimSelect.innerHTML = `<option value="">-- Pilih Mahasiswa --</option>`;
    try {
      const resStud = await AcademicAPI.getStudents();
      if (resStud.success) {
        resStud.students.forEach(s => {
          const opt = document.createElement("option");
          opt.value = s.nim;
          opt.textContent = `${s.nim} - ${s.name} (${s.major})`;
          elGradeNimSelect.appendChild(opt);
        });
      }
    } catch (e) {
      console.error(e);
    }

    // Get Dosen's courses to check which ones are taught by current Dosen
    let myCoursesMap = {};
    try {
      const resCourse = await AcademicAPI.getCourses();
      if (resCourse.success) {
        const myCourses = resCourse.courses.filter(c => c.lecturer.toLowerCase().trim() === currentUser.name.toLowerCase().trim());
        myCourses.forEach(c => {
          myCoursesMap[c.courseName.toLowerCase()] = true;
        });
      }
    } catch (e) {
      console.error(e);
    }

    // Populate grades table (filtered to show only this lecturer's course grades)
    try {
      const resGrades = await AcademicAPI.getGrades();
      if (resGrades.success) {
        const filteredGrades = resGrades.grades.filter(g => myCoursesMap[g.courseName.toLowerCase()] === true);
        
        if (filteredGrades.length > 0) {
          elTableGradesBody.innerHTML = "";
          filteredGrades.forEach(g => {
            const row = document.createElement("tr");
            const ipkVal = g.ipk !== "" ? `<span class="ipk-highlight">${parseFloat(g.ipk).toFixed(2)}</span>` : "";
            const scoreNum = parseFloat(g.grade);
            let scoreText = "-";
            if (!isNaN(scoreNum)) {
              const letter = getLetterFromScore(scoreNum);
              scoreText = `${scoreNum} (${letter})`;
            }
            row.innerHTML = `
              <td>${escapeHTML(g.nim)}</td>
              <td>${escapeHTML(g.name)}</td>
              <td>${escapeHTML(g.courseName)}</td>
              <td><strong class="badge ${getGradeBadgeClass(getLetterFromScore(scoreNum))}">${scoreText}</strong></td>
              <td>${ipkVal}</td>
            `;
            elTableGradesBody.appendChild(row);
          });
        } else {
          elTableGradesBody.innerHTML = `<tr><td colspan="5" class="text-center">Belum ada riwayat nilai untuk kelas Anda.</td></tr>`;
        }
      }
    } catch (err) {
      elTableGradesBody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">Gagal memuat nilai: ${err.message}</td></tr>`;
    }
  }

  // Handle student selection change to load active grades and generate input form
  if (elGradeNimSelect) {
    elGradeNimSelect.addEventListener("change", async () => {
      const nim = elGradeNimSelect.value;
      if (!nim) {
        elGradePlaceholder.classList.remove("hidden");
        elGradeInputSection.classList.add("hidden");
        elGradeCoursesList.innerHTML = "";
        return;
      }
      
      setLoader(true, "Memuat nilai mahasiswa...");
      elGradePlaceholder.classList.add("hidden");
      elGradeInputSection.classList.remove("hidden");
      elGradeCoursesList.innerHTML = "";
      
      try {
        const courseRes = await AcademicAPI.getCourses();
        if (!courseRes.success) throw new Error("Gagal mengambil data mata kuliah.");
        
        const myCourses = courseRes.courses.filter(c => c.lecturer.toLowerCase().trim() === currentUser.name.toLowerCase().trim());
        
        const gradesRes = await AcademicAPI.getStudentGrades(nim);
        const existingGradesMap = {};
        if (gradesRes.success) {
          gradesRes.grades.forEach(g => {
            existingGradesMap[g.courseName.toLowerCase()] = g.grade;
          });
        }
        
        if (myCourses.length === 0) {
          elGradeCoursesList.innerHTML = `<div class="text-center text-muted" style="padding: 1rem 0;">Anda tidak memiliki mata kuliah yang diampu.</div>`;
          elGradeInputSection.classList.add("hidden");
          elGradePlaceholder.classList.remove("hidden");
          return;
        }
        
        myCourses.forEach(c => {
          const existingScore = existingGradesMap[c.courseName.toLowerCase()];
          const existingValue = existingScore !== undefined ? existingScore : "";
          
          const row = document.createElement("div");
          row.style.cssText = "display: flex; align-items: center; justify-content: space-between; gap: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.75rem;";
          row.innerHTML = `
            <div style="flex: 1;">
              <h4 style="margin: 0; font-weight: 600; font-size: 0.95rem;">${escapeHTML(c.courseName)}</h4>
              <span style="font-size: 0.75rem; color: var(--text-muted);">${c.courseCode} &bull; ${c.sks} SKS</span>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <input type="number" class="grade-score-input" data-course-code="${c.courseCode}" data-sks="${c.sks}" min="0" max="100" value="${existingValue}" placeholder="1-100" style="width: 80px; padding: 0.5rem; text-align: center; border-radius: var(--radius-sm); border: 1.5px solid var(--border-color); font-weight: 600; font-size: 0.9rem;">
              <span class="badge badge-secondary grade-letter-badge" style="width: 45px; text-align: center; justify-content: center; min-height: 25px; display: inline-flex; align-items: center;">-</span>
            </div>
          `;
          elGradeCoursesList.appendChild(row);
        });
        
        const inputs = elGradeCoursesList.querySelectorAll(".grade-score-input");
        inputs.forEach(input => {
          input.addEventListener("input", () => {
            updateInputRowLetter(input);
            calculateRealtimeGPA();
          });
          updateInputRowLetter(input);
        });
        
        calculateRealtimeGPA();
      } catch (err) {
        showToast("Error: " + err.message, "error");
      } finally {
        setLoader(false);
      }
    });
  }

  function updateInputRowLetter(input) {
    const parent = input.parentElement;
    const badge = parent.querySelector(".grade-letter-badge");
    const val = input.value.trim();
    
    if (val === "") {
      badge.textContent = "-";
      badge.className = "badge badge-secondary grade-letter-badge";
      return;
    }
    
    const score = parseFloat(val);
    if (isNaN(score) || score < 0 || score > 100) {
      badge.textContent = "?";
      badge.className = "badge badge-danger grade-letter-badge";
      return;
    }
    
    const letter = getLetterFromScore(score);
    badge.textContent = letter;
    badge.className = `badge ${getGradeBadgeClass(letter)} grade-letter-badge`;
  }

  function calculateRealtimeGPA() {
    const inputs = elGradeCoursesList.querySelectorAll(".grade-score-input");
    let totalSks = 0;
    let totalWeightedPoints = 0;
    
    inputs.forEach(input => {
      const val = input.value.trim();
      if (val !== "") {
        const score = parseFloat(val);
        if (!isNaN(score) && score >= 0 && score <= 100) {
          const sks = parseInt(input.getAttribute("data-sks"));
          const weight = getWeightFromScore(score);
          totalSks += sks;
          totalWeightedPoints += (sks * weight);
        }
      }
    });
    
    elGradePreviewSks.textContent = `${totalSks} SKS`;
    const gpa = totalSks > 0 ? (totalWeightedPoints / totalSks) : 0.0;
    elGradePreviewGpa.textContent = gpa.toFixed(2);
  }

  // Handle batch grade submit
  if (elFormGrade) {
    elFormGrade.addEventListener("submit", async (e) => {
      e.preventDefault();
      
      const nim = elGradeNimSelect.value;
      if (!nim) return;
      
      const inputs = elGradeCoursesList.querySelectorAll(".grade-score-input");
      const gradesPayload = [];
      let hasError = false;
      
      inputs.forEach(input => {
        const val = input.value.trim();
        const code = input.getAttribute("data-course-code");
        
        if (val !== "") {
          const score = parseFloat(val);
          if (isNaN(score) || score < 0 || score > 100) {
            hasError = true;
          }
          gradesPayload.push({ courseCode: code, grade: score });
        } else {
          gradesPayload.push({ courseCode: code, grade: "" });
        }
      });
      
      if (hasError) {
        showToast("Rentang nilai harus berkisar 0 - 100.", "error");
        return;
      }
      
      setLoader(true, "Menyimpan seluruh nilai...");
      
      try {
        const res = await AcademicAPI.saveStudentGrades(nim, gradesPayload);
        if (res.success) {
          showToast("Seluruh nilai mahasiswa berhasil diperbarui!");
          elFormGrade.reset();
          loadGradesView();
        } else {
          showToast(res.message || "Gagal menyimpan nilai.", "error");
        }
      } catch (err) {
        showToast("Error: " + err.message, "error");
      } finally {
        setLoader(false);
      }
    });
  }

  // ==========================================
  // VIEW: MAHASISWA DASHBOARD ACTIONS (STUDENT ONLY)
  // ==========================================
  const elStudentDisplayPhoto = document.getElementById("student-display-photo");
  const elStudentDisplayName = document.getElementById("student-display-name");
  const elStudentDisplayNim = document.getElementById("student-display-nim");
  const elStudentDisplayMajor = document.getElementById("student-display-major");
  const elStudentDisplayGpa = document.getElementById("student-display-gpa");
  const elTableStudentKhsBody = document.querySelector("#table-student-khs tbody");

  async function loadStudentDashboard() {
    if (!currentUser) return;
    
    elStudentDisplayPhoto.src = currentUser.photoUrl || defaultAvatar;
    elStudentDisplayName.textContent = currentUser.name;
    elStudentDisplayNim.textContent = currentUser.username;
    elStudentDisplayMajor.textContent = currentUser.major;
    
    elTableStudentKhsBody.innerHTML = `<tr><td colspan="6" class="text-center">Memuat KHS...</td></tr>`;
    
    try {
      const res = await AcademicAPI.getStudentGrades(currentUser.username);
      if (res.success) {
        elTableStudentKhsBody.innerHTML = "";
        
        let totalSks = 0;
        let totalWeightedPoints = 0;
        
        if (res.grades.length > 0) {
          res.grades.forEach(g => {
            const scoreNum = parseFloat(g.grade);
            let letter = "-";
            let weight = 0.0;
            if (!isNaN(scoreNum)) {
              letter = getLetterFromScore(scoreNum);
              weight = getWeightFromScore(scoreNum);
            }
            totalSks += g.sks;
            totalWeightedPoints += (g.sks * weight);
            
            const row = document.createElement("tr");
            row.innerHTML = `
              <td><strong>${escapeHTML(g.courseCode)}</strong></td>
              <td>${escapeHTML(g.courseName)}</td>
              <td class="sks-cell">${g.sks} SKS</td>
              <td>${escapeHTML(g.lecturer)}</td>
              <td><span class="badge ${getGradeBadgeClass(letter)}">${scoreNum} (${letter})</span></td>
              <td>${weight.toFixed(1)}</td>
            `;
            elTableStudentKhsBody.appendChild(row);
          });
          
          const overallGpa = totalSks > 0 ? (totalWeightedPoints / totalSks) : 0.0;
          elStudentDisplayGpa.textContent = overallGpa.toFixed(2);
          
          const summaryRow = document.createElement("tr");
          summaryRow.className = "gpa-summary-row";
          summaryRow.innerHTML = `
            <td colspan="2">TOTAL KREDIT & INDEKS PRESTASI KUMULATIF (IPK)</td>
            <td class="sks-cell">${totalSks} SKS</td>
            <td></td>
            <td>IPK</td>
            <td class="ipk-value">${overallGpa.toFixed(2)}</td>
          `;
          elTableStudentKhsBody.appendChild(summaryRow);
          
        } else {
          elTableStudentKhsBody.innerHTML = `<tr><td colspan="6" class="text-center">Belum ada nilai KHS yang diinput oleh dosen Anda.</td></tr>`;
          elStudentDisplayGpa.textContent = "0.00";
        }
      }
    } catch (err) {
      elTableStudentKhsBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Gagal memuat KHS: ${err.message}</td></tr>`;
    }
  }

  // ==========================================
  // VIEW: SETTINGS ACTIONS
  // ==========================================
  const elSettingsGasUrl = document.getElementById("settings-gas-url");
  const elBtnInitDb = document.getElementById("btn-init-db");
  const elSettingsStatus = document.getElementById("settings-status");
 
  function loadSettingsView() {
    elSettingsGasUrl.value = AcademicAPI.getGasUrl();
    elSettingsStatus.classList.add("hidden");
  }

  elBtnInitDb.addEventListener("click", async () => {
    setLoader(true, "Menginisialisasi Spreadsheet...");
    elSettingsStatus.classList.add("hidden");
    
    try {
      const res = await AcademicAPI.initDatabase();
      if (res.success) {
        showToast("Spreadsheet berhasil diinisialisasi!");
        elSettingsStatus.className = "alert alert-info";
        elSettingsStatus.innerHTML = `<i class="fa-solid fa-circle-check"></i> Database di spreadsheet berhasil disiapkan. Kredensial Admin default telah dimasukkan.`;
        elSettingsStatus.classList.remove("hidden");
      } else {
        showToast("Gagal menginisialisasi spreadsheet.", "error");
        elSettingsStatus.className = "alert alert-danger";
        elSettingsStatus.innerHTML = `<i class="fa-solid fa-circle-xmark"></i> Gagal: ${res.message}. Periksa kembali deployment URL.`;
        elSettingsStatus.classList.remove("hidden");
      }
    } catch (err) {
      showToast("Error: " + err.message, "error");
      elSettingsStatus.className = "alert alert-danger";
      elSettingsStatus.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> Terjadi kesalahan: ${err.message}`;
      elSettingsStatus.classList.remove("hidden");
    } finally {
      setLoader(false);
    }
  });

  // ==========================================
  // GENERAL HELPERS
  // ==========================================
  function escapeHTML(str) {
    if (!str) return "";
    return str.toString()
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function getGradeBadgeClass(grade) {
    switch (grade) {
      case "A": return "badge-success";
      case "B+":
      case "B": return "badge-blue";
      case "C+":
      case "C": return "badge-warning";
      case "D": return "badge-orange";
      case "E": return "badge-danger";
      default: return "badge-secondary";
    }
  }

  function getLetterFromScore(score) {
    const val = parseFloat(score);
    if (isNaN(val)) return "-";
    if (val >= 80) return "A";
    if (val >= 75) return "B+";
    if (val >= 70) return "B";
    if (val >= 65) return "C+";
    if (val >= 60) return "C";
    if (val >= 50) return "D";
    return "E";
  }

  function getWeightFromScore(score) {
    const val = parseFloat(score);
    if (isNaN(val)) return 0.0;
    if (val >= 80) return 4.0;
    if (val >= 75) return 3.5;
    if (val >= 70) return 3.0;
    if (val >= 65) return 2.5;
    if (val >= 60) return 2.0;
    if (val >= 50) return 1.0;
    return 0.0;
  }

  // Bind Sidebar Navigation Clicks
  elMenuItems.forEach(item => {
    item.addEventListener("click", () => {
      const view = item.getAttribute("data-view");
      if (view) {
        showView(view);
      }
    });
  });

  // Bootstrap Application
  checkSession();
});
