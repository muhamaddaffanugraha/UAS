/**
 * SiNilai - Main Application Logic (Three-Role Edition)
 */

document.addEventListener("DOMContentLoaded", () => {
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

  // Initialize offline mock database
  AcademicAPI.mockInit();

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
      showLoginScreen();
    }
  }

  function showLoginScreen() {
    elLoginUsername.value = "";
    elLoginPassword.value = "";
    elAppView.classList.add("hidden");
    elLoginView.classList.remove("hidden");
    currentUser = null;
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

  // Form Login Handler
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
    showLoginScreen();
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
            opt.value = d.name; // Save lecturer name
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
        // Filter courses taught by this lecturer
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
  const elGradeCourseSelect = document.getElementById("grade-course");
  const elTableGradesBody = document.querySelector("#table-grades tbody");

  async function loadGradesView() {
    if (!currentUser) return;
    
    elTableGradesBody.innerHTML = `<tr><td colspan="5" class="text-center">Memuat data...</td></tr>`;
    
    // 1. Populate students list dropdown (with all registered students)
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

    // 2. Populate courses dropdown (only courses taught by this lecturer)
    elGradeCourseSelect.innerHTML = `<option value="">-- Pilih Mata Kuliah --</option>`;
    let myCoursesMap = {};
    try {
      const resCourse = await AcademicAPI.getCourses();
      if (resCourse.success) {
        const myCourses = resCourse.courses.filter(c => c.lecturer.toLowerCase().trim() === currentUser.name.toLowerCase().trim());
        
        myCourses.forEach(c => {
          myCoursesMap[c.courseName.toLowerCase()] = true;
          
          const opt = document.createElement("option");
          opt.value = c.courseCode;
          opt.textContent = `${c.courseCode} - ${c.courseName}`;
          elGradeCourseSelect.appendChild(opt);
        });
      }
    } catch (e) {
      console.error(e);
    }

    // 3. Populate grades history table (filtered to only show grades for this lecturer's courses)
    try {
      const resGrades = await AcademicAPI.getGrades();
      if (resGrades.success) {
        // Filter grades to show only this lecturer's course grades
        const filteredGrades = resGrades.grades.filter(g => myCoursesMap[g.courseName.toLowerCase()] === true);
        
        if (filteredGrades.length > 0) {
          elTableGradesBody.innerHTML = "";
          filteredGrades.forEach(g => {
            const row = document.createElement("tr");
            const ipkVal = g.ipk !== "" ? `<span class="ipk-highlight">${parseFloat(g.ipk).toFixed(2)}</span>` : "";
            row.innerHTML = `
              <td>${escapeHTML(g.nim)}</td>
              <td>${escapeHTML(g.name)}</td>
              <td>${escapeHTML(g.courseName)}</td>
              <td><strong class="badge ${getGradeBadgeClass(g.grade)}">${g.grade}</strong></td>
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

  if (elFormGrade) {
    elFormGrade.addEventListener("submit", async (e) => {
      e.preventDefault();
      setLoader(true, "Menyimpan Nilai...");
      
      const nim = elGradeNimSelect.value;
      const courseCode = elGradeCourseSelect.value;
      const grade = document.getElementById("grade-score").value;
      
      try {
        const res = await AcademicAPI.addGrade(nim, courseCode, grade);
        if (res.success) {
          showToast("Nilai berhasil disimpan!");
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
            const weight = gradeWeights[g.grade] !== undefined ? gradeWeights[g.grade] : 0.0;
            totalSks += g.sks;
            totalWeightedPoints += (g.sks * weight);
            
            const row = document.createElement("tr");
            row.innerHTML = `
              <td><strong>${escapeHTML(g.courseCode)}</strong></td>
              <td>${escapeHTML(g.courseName)}</td>
              <td class="sks-cell">${g.sks} SKS</td>
              <td>${escapeHTML(g.lecturer)}</td>
              <td><span class="badge ${getGradeBadgeClass(g.grade)}">${g.grade}</span></td>
              <td>${weight.toFixed(1)}</td>
            `;
            elTableStudentKhsBody.appendChild(row);
          });
          
          const overallGpa = totalSks > 0 ? (totalWeightedPoints / totalSks) : 0.0;
          elStudentDisplayGpa.textContent = overallGpa.toFixed(2);
          
          // GPA summary row at the end
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
  const elBtnSaveSettings = document.getElementById("btn-save-settings");
  const elBtnInitDb = document.getElementById("btn-init-db");
  const elSettingsStatus = document.getElementById("settings-status");

  function loadSettingsView() {
    elSettingsGasUrl.value = AcademicAPI.getGasUrl();
    elSettingsStatus.classList.add("hidden");
  }

  elBtnSaveSettings.addEventListener("click", () => {
    const url = elSettingsGasUrl.value.trim();
    AcademicAPI.setGasUrl(url);
    
    if (url) {
      showToast("Koneksi Google Sheets disimpan!");
      elSettingsStatus.className = "alert alert-info";
      elSettingsStatus.innerHTML = `<i class="fa-solid fa-link"></i> Terhubung ke Google Sheets API. Klik <strong>Inisialisasi Google Sheet</strong> jika spreadsheet masih baru.`;
      elSettingsStatus.classList.remove("hidden");
    } else {
      showToast("Kembali menggunakan Mock Database (localStorage).");
      elSettingsStatus.className = "alert alert-info";
      elSettingsStatus.innerHTML = `<i class="fa-solid fa-database"></i> Menjalankan database lokal offline (localStorage).`;
      elSettingsStatus.classList.remove("hidden");
    }
    
    if (currentUser) {
      loadDashboardStats();
    }
  });

  elBtnInitDb.addEventListener("click", async () => {
    setLoader(true, "Menginisialisasi Spreadsheet...");
    elSettingsStatus.classList.add("hidden");
    
    try {
      const res = await AcademicAPI.initDatabase();
      if (res.success) {
        showToast("Spreadsheet berhasil diinisialisasi!");
        elSettingsStatus.className = "alert alert-info";
        elSettingsStatus.innerHTML = `<i class="fa-solid fa-circle-check"></i> Database di spreadsheet berhasil disiapkan. Kredensial default (admin, dosen, mhs) telah diinput.`;
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
