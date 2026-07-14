/**
 * SiNilai - API Connector (Three-Role Edition)
 * Automatically falls back to localStorage if no Google Apps Script Web App URL is configured.
 */

const AcademicAPI = {
  getGasUrl() {
    return localStorage.getItem("sinilai_gas_url") || "";
  },
  
  setGasUrl(url) {
    if (url) {
      localStorage.setItem("sinilai_gas_url", url.trim());
    } else {
      localStorage.removeItem("sinilai_gas_url");
    }
  },
  
  isUsingGas() {
    return !!this.getGasUrl();
  },

  async fetchGas(action, params = {}, postData = null) {
    const baseUrl = this.getGasUrl();
    if (!baseUrl) throw new Error("GAS URL is not configured");

    const urlObj = new URL(baseUrl);
    urlObj.searchParams.append("action", action);
    for (const [key, val] of Object.entries(params)) {
      urlObj.searchParams.append(key, val);
    }

    const options = {
      method: postData ? "POST" : "GET",
      mode: "cors"
    };

    if (postData) {
      options.body = JSON.stringify({ action, ...postData });
    }

    try {
      const response = await fetch(urlObj.toString(), options);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error("API Error:", error);
      return { success: false, message: `Koneksi Google Sheets Gagal: ${error.message}` };
    }
  },

  async call(action, params = {}, postData = null) {
    if (this.isUsingGas()) {
      return await this.fetchGas(action, params, postData);
    } else {
      return this.mockCall(action, params, postData);
    }
  },

  async initDatabase() {
    return await this.call("initDatabase");
  },

  async login(username, password) {
    return await this.call("login", {}, { username, password });
  },

  async getDashboardStats() {
    return await this.call("getDashboardStats");
  },

  async getCourses() {
    return await this.call("getCourses");
  },

  async addCourse(courseCode, courseName, sks, lecturer) {
    return await this.call("addCourse", {}, { courseCode, courseName, sks, lecturer });
  },

  async getStudents() {
    return await this.call("getStudents");
  },

  async addStudent(nim, password, name, major, photoUrl) {
    return await this.call("addStudent", {}, { nim, password, name, major, photoUrl });
  },

  async getDosens() {
    return await this.call("getDosens");
  },

  async addDosen(nidn, password, name, photoUrl) {
    return await this.call("addDosen", {}, { nidn, password, name, photoUrl });
  },

  async getGrades() {
    return await this.call("getGrades");
  },

  async getStudentGrades(nim) {
    return await this.call("getStudentGrades", { nim });
  },

  async addGrade(nim, courseCode, grade) {
    return await this.call("addGrade", {}, { nim, courseCode, grade });
  },

  // ==========================================
  // LOCAL STORAGE MOCK DATABASE IMPLEMENTATION
  // ==========================================
  mockCall(action, params, postData) {
    this.mockInit();

    try {
      switch (action === "doGet" ? params.action : action) {
        case "initDatabase":
          return { success: true, message: "Mock Database initialized in localStorage" };
          
        case "login":
          return this.mockLogin(postData.username, postData.password);
          
        case "getDashboardStats":
          return this.mockGetDashboardStats();
          
        case "getCourses":
          return { success: true, courses: JSON.parse(localStorage.getItem("sinilai_courses")) };
          
        case "getStudents":
          const usersStud = JSON.parse(localStorage.getItem("sinilai_users"));
          const students = usersStud.filter(u => u.role === "mhs").map(u => ({
            nim: u.username,
            name: u.name,
            major: u.major,
            photoUrl: u.photoUrl
          }));
          return { success: true, students };

        case "getDosens":
          const usersDsn = JSON.parse(localStorage.getItem("sinilai_users"));
          const dosens = usersDsn.filter(u => u.role === "dsn").map(u => ({
            nidn: u.username,
            name: u.name,
            photoUrl: u.photoUrl
          }));
          return { success: true, dosens };
          
        case "getGrades":
          return { success: true, grades: JSON.parse(localStorage.getItem("sinilai_grades")) };
          
        case "getStudentGrades":
          return this.mockGetStudentGrades(params.nim);
          
        case "addCourse":
          return this.mockAddCourse(postData.courseCode, postData.courseName, postData.sks, postData.lecturer);
          
        case "addStudent":
          return this.mockAddStudent(postData.nim, postData.password, postData.name, postData.major, postData.photoUrl);

        case "addDosen":
          return this.mockAddDosen(postData.nidn, postData.password, postData.name, postData.photoUrl);
          
        case "addGrade":
          return this.mockAddGrade(postData.nim, postData.courseCode, postData.grade);
          
        default:
          return { success: false, message: `Mock action '${action}' not supported` };
      }
    } catch (e) {
      return { success: false, message: e.toString() };
    }
  },

  mockInit() {
    if (!localStorage.getItem("sinilai_users")) {
      const sampleUsers = [
        { username: "admin", password: "admin123", role: "adm", name: "System Administrator", major: "-", photoUrl: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150" },
        { username: "54321", password: "dsn123", role: "dsn", name: "Dr. Ir. H. Ahmad Fauzi", major: "-", photoUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150" },
        { username: "54322", password: "dsn123", role: "dsn", name: "Prof. Rahmat Hidayat", major: "-", photoUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150" },
        { username: "12345", password: "mhs123", role: "mhs", name: "Budi Santoso", major: "Teknik Informatika", photoUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150" },
        { username: "12346", password: "mhs123", role: "mhs", name: "Siti Aminah", major: "Sistem Informasi", photoUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150" }
      ];
      localStorage.setItem("sinilai_users", JSON.stringify(sampleUsers));
    }

    if (!localStorage.getItem("sinilai_courses")) {
      const sampleCourses = [
        { courseCode: "IF101", courseName: "Pemrograman Dasar", sks: 3, lecturer: "Dr. Ir. H. Ahmad Fauzi" },
        { courseCode: "IF102", courseName: "Struktur Data", sks: 4, lecturer: "Prof. Rahmat Hidayat" },
        { courseCode: "IF103", courseName: "Basis Data", sks: 3, lecturer: "Dr. Ir. H. Ahmad Fauzi" }
      ];
      localStorage.setItem("sinilai_courses", JSON.stringify(sampleCourses));
    }

    if (!localStorage.getItem("sinilai_grades")) {
      const sampleGrades = [
        { nim: "12345", name: "Budi Santoso", courseName: "Pemrograman Dasar", grade: "A", ipk: "" },
        { nim: "12345", name: "Budi Santoso", courseName: "Struktur Data", grade: "B+", ipk: "3.71" }
      ];
      localStorage.setItem("sinilai_grades", JSON.stringify(sampleGrades));
    }
  },

  mockLogin(username, password) {
    const users = JSON.parse(localStorage.getItem("sinilai_users"));
    const user = users.find(u => u.username.trim() === username.trim() && u.password === password);
    
    if (user) {
      return {
        success: true,
        user: {
          username: user.username,
          role: user.role,
          name: user.name,
          major: user.major,
          photoUrl: user.photoUrl
        }
      };
    }
    return { success: false, message: "ID Pengguna atau Kata Sandi salah" };
  },

  mockGetDashboardStats() {
    const users = JSON.parse(localStorage.getItem("sinilai_users")) || [];
    const courses = JSON.parse(localStorage.getItem("sinilai_courses")) || [];
    const grades = JSON.parse(localStorage.getItem("sinilai_grades")) || [];
    
    const totalStudents = users.filter(u => u.role === "mhs").length;
    return {
      success: true,
      stats: {
        totalStudents,
        totalCourses: courses.length,
        totalGrades: grades.length
      }
    };
  },

  mockAddCourse(courseCode, courseName, sks, lecturer) {
    const courses = JSON.parse(localStorage.getItem("sinilai_courses")) || [];
    if (courses.some(c => c.courseCode.toLowerCase() === courseCode.toLowerCase())) {
      return { success: false, message: "Kode mata kuliah sudah terdaftar" };
    }
    courses.push({ courseCode, courseName, sks: parseInt(sks), lecturer });
    localStorage.setItem("sinilai_courses", JSON.stringify(courses));
    return { success: true, message: "Mata kuliah berhasil ditambahkan" };
  },

  mockAddStudent(nim, password, name, major, photoUrl) {
    const users = JSON.parse(localStorage.getItem("sinilai_users")) || [];
    if (users.some(u => u.username === nim)) {
      return { success: false, message: "NIM Mahasiswa sudah terdaftar" };
    }
    users.push({ username: nim, password, role: "mhs", name, major, photoUrl: photoUrl || "" });
    localStorage.setItem("sinilai_users", JSON.stringify(users));
    return { success: true, message: "Mahasiswa berhasil ditambahkan" };
  },

  mockAddDosen(nidn, password, name, photoUrl) {
    const users = JSON.parse(localStorage.getItem("sinilai_users")) || [];
    if (users.some(u => u.username === nidn)) {
      return { success: false, message: "NIDN Dosen sudah terdaftar" };
    }
    users.push({ username: nidn, password, role: "dsn", name, major: "-", photoUrl: photoUrl || "" });
    localStorage.setItem("sinilai_users", JSON.stringify(users));
    return { success: true, message: "Dosen berhasil ditambahkan" };
  },

  mockAddGrade(nim, courseCode, grade) {
    const users = JSON.parse(localStorage.getItem("sinilai_users")) || [];
    const courses = JSON.parse(localStorage.getItem("sinilai_courses")) || [];
    const grades = JSON.parse(localStorage.getItem("sinilai_grades")) || [];
    
    const student = users.find(u => u.username === nim && u.role === "mhs");
    if (!student) return { success: false, message: "NIM Mahasiswa tidak ditemukan" };
    
    const course = courses.find(c => c.courseCode === courseCode);
    if (!course) return { success: false, message: "Kode Mata Kuliah tidak ditemukan" };
    
    const existingIndex = grades.findIndex(g => g.nim === nim && g.courseName.toLowerCase() === course.courseName.toLowerCase());
    
    if (existingIndex !== -1) {
      grades[existingIndex].grade = grade;
    } else {
      grades.push({
        nim: nim,
        name: student.name,
        courseName: course.courseName,
        grade: grade,
        ipk: ""
      });
    }
    
    localStorage.setItem("sinilai_grades", JSON.stringify(grades));
    this.mockRecalculateIPK(nim);
    
    return { success: true, message: "Nilai berhasil disimpan" };
  },

  mockRecalculateIPK(nim) {
    const grades = JSON.parse(localStorage.getItem("sinilai_grades")) || [];
    const courses = JSON.parse(localStorage.getItem("sinilai_courses")) || [];
    
    const courseSksMap = {};
    courses.forEach(c => {
      courseSksMap[c.courseName.toLowerCase()] = c.sks;
    });

    const gradeWeights = { "A": 4.0, "B+": 3.5, "B": 3.0, "C+": 2.5, "C": 2.0, "D": 1.0, "E": 0.0 };
    let totalSks = 0;
    let totalPoints = 0;
    let studentIndices = [];
    
    grades.forEach((g, idx) => {
      if (g.nim === nim) {
        studentIndices.push(idx);
        g.ipk = "";
        
        const sks = courseSksMap[g.courseName.toLowerCase()] || 3;
        const weight = gradeWeights[g.grade];
        if (weight !== undefined) {
          totalSks += sks;
          totalPoints += (sks * weight);
        }
      }
    });
    
    if (studentIndices.length > 0) {
      const finalIpk = totalSks > 0 ? (totalPoints / totalSks).toFixed(2) : "0.00";
      const lastIndex = studentIndices[studentIndices.length - 1];
      grades[lastIndex].ipk = parseFloat(finalIpk);
    }
    
    localStorage.setItem("sinilai_grades", JSON.stringify(grades));
  },

  mockGetStudentGrades(nim) {
    const grades = JSON.parse(localStorage.getItem("sinilai_grades")) || [];
    const courses = JSON.parse(localStorage.getItem("sinilai_courses")) || [];
    
    const courseMap = {};
    courses.forEach(c => {
      courseMap[c.courseName.toLowerCase()] = {
        code: c.courseCode,
        sks: c.sks,
        lecturer: c.lecturer
      };
    });

    const studentGrades = [];
    grades.forEach(g => {
      if (g.nim === nim) {
        const details = courseMap[g.courseName.toLowerCase()] || { code: "-", sks: 3, lecturer: "Dosen Pengampu" };
        studentGrades.push({
          courseCode: details.code,
          courseName: g.courseName,
          sks: details.sks,
          lecturer: details.lecturer,
          grade: g.grade
        });
      }
    });

    const gradeWeights = { "A": 4.0, "B+": 3.5, "B": 3.0, "C+": 2.5, "C": 2.0, "D": 1.0, "E": 0.0 };
    let totalSks = 0;
    let totalPoints = 0;
    
    studentGrades.forEach(g => {
      const weight = gradeWeights[g.grade];
      if (weight !== undefined) {
        totalSks += g.sks;
        totalPoints += (g.sks * weight);
      }
    });

    const ipk = totalSks > 0 ? (totalPoints / totalSks) : 0.0;

    return {
      success: true,
      grades: studentGrades,
      ipk: parseFloat(ipk.toFixed(2))
    };
  }
};
