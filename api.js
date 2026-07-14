/**
 * SiNilai - API Connector (Google Sheets Production Edition)
 * Routes all database queries directly to the Google Apps Script Web App.
 */

// Default hardcoded Google Apps Script Web App URL from your Vercel deployment logs
const CONFIG_GAS_URL = "https://script.google.com/macros/s/AKfycbw8sokBvT4-fJj8Ca9uUsVVIvohXHRx5MLztRj1E3tL76-aue-E9nSA-Ll4lOeSAuvCpg/exec";

const AcademicAPI = {
  getGasUrl() {
    return CONFIG_GAS_URL;
  },

  async fetchGas(action, params = {}, postData = null) {
    const baseUrl = this.getGasUrl();
    if (!baseUrl) throw new Error("URL Database Google Sheets belum dikonfigurasi.");

    const urlObj = new URL(baseUrl);
    urlObj.searchParams.append("action", action);
    for (const [key, val] of Object.entries(params)) {
      urlObj.searchParams.append(key, val);
    }

    const options = {
      method: postData ? "POST" : "GET",
      headers: {}
    };

    if (postData) {
      // Send as text/plain to bypass CORS preflight.
      options.body = JSON.stringify({ action, ...postData });
      options.headers['Content-Type'] = 'text/plain;charset=utf-8';
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
    return await this.fetchGas(action, params, postData);
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

  async saveStudentGrades(nim, grades) {
    return await this.call("saveStudentGrades", {}, { nim, grades });
  }
};
