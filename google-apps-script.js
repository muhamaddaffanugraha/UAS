/**
 * SiNilai - Google Sheets Database API (Production Edition - 1-100 Numeric Scale)
 * Copy this code into your Google Apps Script Editor (Extensions > Apps Script).
 * Deploy it as a Web App (Deploy > New Deployment > Web App).
 * Configure:
 * - Execute as: Me
 * - Who has access: Anyone
 */

function doGet(e) {
  var action = e.parameter.action;
  var response = { success: false, message: "Invalid action" };
  
  try {
    if (action === "initDatabase") {
      response = initDatabase();
    } else if (action === "getDashboardStats") {
      response = getDashboardStats();
    } else if (action === "getCourses") {
      response = getCourses();
    } else if (action === "getStudents") {
      response = getStudents();
    } else if (action === "getDosens") {
      response = getDosens();
    } else if (action === "getGrades") {
      response = getGrades();
    } else if (action === "getStudentGrades") {
      var nim = e.parameter.nim;
      response = getStudentGrades(nim);
    }
  } catch (err) {
    response = { success: false, message: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  var response = { success: false, message: "Invalid post action" };
  
  try {
    var data = JSON.parse(e.postData.contents);
    var action = data.action;
    
    if (action === "login") {
      response = login(data.username, data.password);
    } else if (action === "addCourse") {
      response = addCourse(data.courseCode, data.courseName, data.sks, data.lecturer);
    } else if (action === "addGrade") {
      response = addGrade(data.nim, data.courseCode, data.grade);
    } else if (action === "saveStudentGrades") {
      response = saveStudentGrades(data.nim, data.grades);
    } else if (action === "addStudent") {
      response = addStudent(data.nim, data.password, data.name, data.major, data.photoUrl);
    } else if (action === "addDosen") {
      response = addDosen(data.nidn, data.password, data.name, data.photoUrl);
    }
  } catch (err) {
    response = { success: false, message: err.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// Helper to open spreadsheet
function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

// Initialize database sheets
function initDatabase() {
  var ss = getSpreadsheet();
  
  // 1. Create Users Sheet
  var usersSheet = ss.getSheetByName("Users");
  if (!usersSheet) {
    usersSheet = ss.insertSheet("Users");
    usersSheet.appendRow(["Username", "Password", "Role", "Name", "Major", "PhotoUrl"]);
  }
  
  // 2. Create Courses Sheet
  var coursesSheet = ss.getSheetByName("Courses");
  if (!coursesSheet) {
    coursesSheet = ss.insertSheet("Courses");
    coursesSheet.appendRow(["CourseCode", "CourseName", "SKS", "Lecturer"]);
  }
  
  // 3. Create Grades Sheet
  var gradesSheet = ss.getSheetByName("Grades");
  if (!gradesSheet) {
    gradesSheet = ss.insertSheet("Grades");
    gradesSheet.appendRow(["NIM", "Nama", "Mata Kuliah", "Nilai", "IPK"]);
  }
  
  return { success: true, message: "Database initialized successfully." };
}

// User login endpoint
function login(username, password) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  
  if (!sheet) return { success: false, message: "Database belum diinisialisasi. Silakan jalankan initDatabase terlebih dahulu." };
  
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === username.toString().trim() && data[i][1].toString() === password.toString()) {
      return {
        success: true,
        user: {
          username: data[i][0].toString(),
          role: data[i][2], // 'adm', 'dsn', or 'mhs'
          name: data[i][3],
          major: data[i][4],
          photoUrl: data[i][5] || ""
        }
      };
    }
  }
  
  return { success: false, message: "ID Pengguna atau Kata Sandi salah" };
}

// Get dashboard stats
function getDashboardStats() {
  var ss = getSpreadsheet();
  var usersSheet = ss.getSheetByName("Users");
  var coursesSheet = ss.getSheetByName("Courses");
  var gradesSheet = ss.getSheetByName("Grades");
  
  var totalStudents = 0;
  if (usersSheet) {
    var users = usersSheet.getDataRange().getValues();
    for (var i = 1; i < users.length; i++) {
      if (users[i][2] === "mhs") totalStudents++;
    }
  }
  
  var totalCourses = coursesSheet ? (coursesSheet.getLastRow() - 1) : 0;
  if (totalCourses < 0) totalCourses = 0;
  
  var totalGrades = gradesSheet ? (gradesSheet.getLastRow() - 1) : 0;
  if (totalGrades < 0) totalGrades = 0;
  
  return {
    success: true,
    stats: {
      totalStudents: totalStudents,
      totalCourses: totalCourses,
      totalGrades: totalGrades
    }
  };
}

// Get all courses
function getCourses() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Courses");
  if (!sheet) return { success: false, courses: [] };
  
  var data = sheet.getDataRange().getValues();
  var courses = [];
  for (var i = 1; i < data.length; i++) {
    courses.push({
      courseCode: data[i][0],
      courseName: data[i][1],
      sks: parseInt(data[i][2]),
      lecturer: data[i][3]
    });
  }
  return { success: true, courses: courses };
}

// Get all students
function getStudents() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  if (!sheet) return { success: false, students: [] };
  
  var data = sheet.getDataRange().getValues();
  var students = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][2] === "mhs") {
      students.push({
        nim: data[i][0].toString(),
        name: data[i][3],
        major: data[i][4],
        photoUrl: data[i][5] || ""
      });
    }
  }
  return { success: true, students: students };
}

// Get all lecturers (dosen)
function getDosens() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  if (!sheet) return { success: false, dosens: [] };
  
  var data = sheet.getDataRange().getValues();
  var dosens = [];
  for (var i = 1; i < data.length; i++) {
    if (data[i][2] === "dsn") {
      dosens.push({
        nidn: data[i][0].toString(),
        name: data[i][3],
        photoUrl: data[i][5] || ""
      });
    }
  }
  return { success: true, dosens: dosens };
}

// Get all grades
function getGrades() {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Grades");
  if (!sheet) return { success: false, grades: [] };
  
  var data = sheet.getDataRange().getValues();
  var grades = [];
  for (var i = 1; i < data.length; i++) {
    grades.push({
      nim: data[i][0].toString(),
      name: data[i][1],
      courseName: data[i][2],
      grade: data[i][3], // Stores numeric value (e.g. 85)
      ipk: data[i][4] !== "" ? parseFloat(data[i][4]) : ""
    });
  }
  return { success: true, grades: grades };
}

// Get student specific grades & details
function getStudentGrades(nim) {
  var ss = getSpreadsheet();
  var gradesSheet = ss.getSheetByName("Grades");
  var coursesSheet = ss.getSheetByName("Courses");
  
  if (!gradesSheet) return { success: false, grades: [], ipk: 0 };
  
  var courseMap = {};
  if (coursesSheet) {
    var coursesData = coursesSheet.getDataRange().getValues();
    for (var c = 1; c < coursesData.length; c++) {
      var cName = coursesData[c][1].toString().trim().toLowerCase();
      courseMap[cName] = {
        code: coursesData[c][0],
        sks: parseInt(coursesData[c][2]),
        lecturer: coursesData[c][3]
      };
    }
  }
  
  var gradesData = gradesSheet.getDataRange().getValues();
  var studentGrades = [];
  
  for (var i = 1; i < gradesData.length; i++) {
    if (gradesData[i][0].toString().trim() === nim.toString().trim()) {
      var cName = gradesData[i][2].toString().trim();
      var cNameKey = cName.toLowerCase();
      var details = courseMap[cNameKey] || { code: "-", sks: 3, lecturer: "Dosen Pengampu" };
      var scoreVal = parseFloat(gradesData[i][3]);
      if (isNaN(scoreVal)) scoreVal = 0;
      
      studentGrades.push({
        courseCode: details.code,
        courseName: cName,
        sks: details.sks,
        lecturer: details.lecturer,
        grade: scoreVal // Return the numeric score
      });
    }
  }
  
  var ipk = calculateIPKFromScores(studentGrades);
  return { success: true, grades: studentGrades, ipk: ipk };
}

// Add master course
function addCourse(courseCode, courseName, sks, lecturer) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Courses");
  if (!sheet) {
    sheet = ss.insertSheet("Courses");
    sheet.appendRow(["CourseCode", "CourseName", "SKS", "Lecturer"]);
  }
  
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim().toLowerCase() === courseCode.toString().trim().toLowerCase()) {
      return { success: false, message: "Kode mata kuliah sudah terdaftar" };
    }
  }
  
  sheet.appendRow([courseCode, courseName, parseInt(sks), lecturer]);
  return { success: true, message: "Mata kuliah berhasil ditambahkan" };
}

// Add student profile
function addStudent(nim, password, name, major, photoUrl) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  if (!sheet) {
    sheet = ss.insertSheet("Users");
    sheet.appendRow(["Username", "Password", "Role", "Name", "Major", "PhotoUrl"]);
  }
  
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === nim.toString().trim()) {
      return { success: false, message: "NIM Mahasiswa sudah terdaftar" };
    }
  }
  
  sheet.appendRow([nim, password, "mhs", name, major, photoUrl || ""]);
  return { success: true, message: "Mahasiswa berhasil ditambahkan" };
}

// Add lecturer (dosen) profile
function addDosen(nidn, password, name, photoUrl) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  if (!sheet) {
    sheet = ss.insertSheet("Users");
    sheet.appendRow(["Username", "Password", "Role", "Name", "Major", "PhotoUrl"]);
  }
  
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0].toString().trim() === nidn.toString().trim()) {
      return { success: false, message: "NIDN Dosen sudah terdaftar" };
    }
  }
  
  sheet.appendRow([nidn, password, "dsn", name, "-", photoUrl || ""]);
  return { success: true, message: "Dosen berhasil ditambahkan" };
}

// Add single student grade
function addGrade(nim, courseCode, grade) {
  var ss = getSpreadsheet();
  var usersSheet = ss.getSheetByName("Users");
  var coursesSheet = ss.getSheetByName("Courses");
  var gradesSheet = ss.getSheetByName("Grades");
  
  if (!gradesSheet) {
    gradesSheet = ss.insertSheet("Grades");
    gradesSheet.appendRow(["NIM", "Nama", "Mata Kuliah", "Nilai", "IPK"]);
  }
  
  // Find Student Name
  var studentName = "";
  if (usersSheet) {
    var users = usersSheet.getDataRange().getValues();
    for (var i = 1; i < users.length; i++) {
      if (users[i][0].toString().trim() === nim.toString().trim()) {
        studentName = users[i][3];
        break;
      }
    }
  }
  if (!studentName) return { success: false, message: "NIM Mahasiswa tidak ditemukan" };
  
  // Find Course Name
  var courseName = "";
  if (coursesSheet) {
    var courses = coursesSheet.getDataRange().getValues();
    for (var j = 1; j < courses.length; j++) {
      if (courses[j][0].toString().trim().toLowerCase() === courseCode.toString().trim().toLowerCase()) {
        courseName = courses[j][1];
        break;
      }
    }
  }
  if (!courseName) return { success: false, message: "Kode Mata Kuliah tidak ditemukan" };
  
  // Prevent duplicate grade entry
  var gradesData = gradesSheet.getDataRange().getValues();
  var existingRowIndex = -1;
  for (var k = 1; k < gradesData.length; k++) {
    if (gradesData[k][0].toString().trim() === nim.toString().trim() && 
        gradesData[k][2].toString().trim().toLowerCase() === courseName.trim().toLowerCase()) {
      existingRowIndex = k + 1;
      break;
    }
  }
  
  var score = parseFloat(grade);
  if (isNaN(score)) score = 0;
  
  if (existingRowIndex !== -1) {
    gradesSheet.getRange(existingRowIndex, 4).setValue(score);
  } else {
    gradesSheet.appendRow([nim, studentName, courseName, score, ""]);
  }
  
  recalculateStudentIPK(nim);
  return { success: true, message: "Nilai berhasil disimpan" };
}

// Batch Save student grades
function saveStudentGrades(nim, grades) {
  var ss = getSpreadsheet();
  var usersSheet = ss.getSheetByName("Users");
  var coursesSheet = ss.getSheetByName("Courses");
  var gradesSheet = ss.getSheetByName("Grades");
  
  if (!gradesSheet) {
    gradesSheet = ss.insertSheet("Grades");
    gradesSheet.appendRow(["NIM", "Nama", "Mata Kuliah", "Nilai", "IPK"]);
  }
  
  // Find Student Name
  var studentName = "";
  if (usersSheet) {
    var users = usersSheet.getDataRange().getValues();
    for (var i = 1; i < users.length; i++) {
      if (users[i][0].toString().trim() === nim.toString().trim()) {
        studentName = users[i][3];
        break;
      }
    }
  }
  if (!studentName) return { success: false, message: "NIM Mahasiswa tidak ditemukan" };
  
  // Map Course Code to Course Name
  var courseCodeMap = {};
  if (coursesSheet) {
    var courses = coursesSheet.getDataRange().getValues();
    for (var j = 1; j < courses.length; j++) {
      courseCodeMap[courses[j][0].toString().trim().toLowerCase()] = courses[j][1].toString().trim();
    }
  }
  
  // Load existing grades
  var gradesRange = gradesSheet.getDataRange();
  var gradesData = gradesRange.getValues();
  
  var studentGradesRowMap = {};
  for (var k = 1; k < gradesData.length; k++) {
    if (gradesData[k][0].toString().trim() === nim.toString().trim()) {
      studentGradesRowMap[gradesData[k][2].toString().trim().toLowerCase()] = k + 1;
    }
  }
  
  // Process grades array
  for (var g = 0; g < grades.length; g++) {
    var item = grades[g];
    var courseName = courseCodeMap[item.courseCode.toLowerCase()];
    if (!courseName) continue;
    
    var existingRow = studentGradesRowMap[courseName.toLowerCase()];
    
    // Check if score is empty or unrated
    if (item.grade === "" || item.grade === null || item.grade === undefined) {
      if (existingRow) {
        // If it exists but is set to empty, delete it (clear contents of row)
        // Note: For simplicity we can clear content or leave it, let's delete the row.
        gradesSheet.deleteRow(existingRow);
        // Reload row maps since rows shifted
        gradesData = gradesSheet.getDataRange().getValues();
        studentGradesRowMap = {};
        for (var idx = 1; idx < gradesData.length; idx++) {
          if (gradesData[idx][0].toString().trim() === nim.toString().trim()) {
            studentGradesRowMap[gradesData[idx][2].toString().trim().toLowerCase()] = idx + 1;
          }
        }
      }
      continue;
    }
    
    var score = parseFloat(item.grade);
    if (isNaN(score)) continue;
    
    if (existingRow) {
      gradesSheet.getRange(existingRow, 4).setValue(score);
    } else {
      gradesSheet.appendRow([nim, studentName, courseName, score, ""]);
      studentGradesRowMap[courseName.toLowerCase()] = gradesSheet.getLastRow();
    }
  }
  
  recalculateStudentIPK(nim);
  return { success: true, message: "Seluruh nilai berhasil disimpan." };
}

// Recalculate student IPK and write only to last row
function recalculateStudentIPK(nim) {
  var ss = getSpreadsheet();
  var gradesSheet = ss.getSheetByName("Grades");
  var coursesSheet = ss.getSheetByName("Courses");
  
  if (!gradesSheet) return;
  
  var courseSksMap = {};
  if (coursesSheet) {
    var courses = coursesSheet.getDataRange().getValues();
    for (var c = 1; c < courses.length; c++) {
      courseSksMap[courses[c][1].toString().trim().toLowerCase()] = parseInt(courses[c][2]);
    }
  }
  
  var gradesData = gradesSheet.getDataRange().getValues();
  var studentGradeEntries = [];
  var rowIndices = [];
  
  for (var i = 1; i < gradesData.length; i++) {
    if (gradesData[i][0].toString().trim() === nim.toString().trim()) {
      var courseName = gradesData[i][2].toString().trim();
      var sks = courseSksMap[courseName.toLowerCase()] || 3;
      var scoreVal = parseFloat(gradesData[i][3]);
      
      if (!isNaN(scoreVal)) {
        studentGradeEntries.push({ sks: sks, score: scoreVal });
        rowIndices.push(i + 1);
      }
    }
  }
  
  if (studentGradeEntries.length === 0) return;
  
  var ipk = calculateIPKFromScores(studentGradeEntries);
  var formattedIpk = ipk.toFixed(2);
  
  for (var r = 0; r < rowIndices.length; r++) {
    gradesSheet.getRange(rowIndices[r], 5).setValue("");
  }
  
  var lastRowForStudent = rowIndices[rowIndices.length - 1];
  gradesSheet.getRange(lastRowForStudent, 5).setValue(formattedIpk);
}

// Calculate GPA based on score weights
function calculateIPKFromScores(gradesList) {
  var totalSks = 0;
  var totalWeightedPoints = 0;
  
  for (var i = 0; i < gradesList.length; i++) {
    var entry = gradesList[i];
    var scoreValue = parseFloat(entry.score);
    if (!isNaN(scoreValue)) {
      var weight = getWeightFromScore(scoreValue);
      totalSks += entry.sks;
      totalWeightedPoints += (entry.sks * weight);
    }
  }
  
  return totalSks > 0 ? (totalWeightedPoints / totalSks) : 0.0;
}

function getWeightFromScore(score) {
  if (score >= 80) return 4.0; // A
  if (score >= 75) return 3.5; // B+
  if (score >= 70) return 3.0; // B
  if (score >= 65) return 2.5; // C+
  if (score >= 60) return 2.0; // C
  if (score >= 50) return 1.0; // D
  return 0.0; // E
}
