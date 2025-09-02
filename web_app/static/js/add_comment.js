// add_comment.js — robust version
(function(){
let departmentsData = {};
let gradesData = {};
let coursesData = [];

function $(sel){ return document.querySelector(sel); }
function el(id){ return document.getElementById(id); }

document.addEventListener('DOMContentLoaded', function(){
  // Load embedded JSON
  try{
    departmentsData = JSON.parse(el('departments-data').textContent || '{}');
    gradesData = JSON.parse(el('grades-data').textContent || '{}');
    coursesData = JSON.parse(el('courses-data').textContent || '[]');
  }catch(e){
    console.error('資料解析失敗：', e);
  }

  const academic = el('academic');
  const department = el('department');
  const grade = el('grade');
  const course = el('course');
  const comment = el('comment_text');
  const rating = el('rating');
  const btnPreview = el('preview-btn');
  const btnSubmit = el('submit-btn');
  const preview = el('preview');
  const previewText = el('preview_text');

  // Populate department + grade when academic changes
  function populateDepartments(){
    const list = departmentsData[academic.value] || [];
    department.innerHTML = '<option value="">請先選擇學制</option>';
    list.forEach(d=>{
      const opt = document.createElement('option');
      opt.value = d.id;
      opt.textContent = d.name;
      department.appendChild(opt);
    });
  }

  function populateGrades(){
    const list = gradesData[academic.value] || [];
    grade.innerHTML = '<option value="">請先選擇學制</option>';
    list.forEach(g=>{
      const opt = document.createElement('option');
      opt.value = g.grade_level || g; // 支援兩種格式
      opt.textContent = g.grade_level || g;
      grade.appendChild(opt);
    });
  }

  function populateCourses(){
    const a = academic.value, d = department.value, g = grade.value;
    let filtered = coursesData.filter(c=>
      (!a || String(c.academic_id) === String(a)) &&
      (!d || String(c.department_id) === String(d)) &&
      (!g || String(c.grade_level) === String(g))
    );
    course.innerHTML = '<option value="">請先選擇學制、科系和年級</option>';
    if(filtered.length === 0){
      course.innerHTML = '<option value="">沒有符合條件的課程</option>';
      return;
    }
    filtered.forEach(c=>{
      const opt = document.createElement('option');
      // 這裡非常重要：value 使用資料表主鍵 id（不是 course_id 欄位）
      opt.value = c.id;
      opt.textContent = `${c.course_name}（${c.course_teacher || '未填寫教師'}）`;
      course.appendChild(opt);
    });

    // 若有預選 courseId 則選上
    const pre = window.__PRESELECTED__ && window.__PRESELECTED__.courseId;
    if(pre){
      course.value = String(pre);
    }
  }

  academic.addEventListener('change', ()=>{ populateDepartments(); populateGrades(); populateCourses(); });
  department.addEventListener('change', populateCourses);
  grade.addEventListener('change', populateCourses);

  // 初始預選（如果有）
  if(window.__PRESELECTED__){
    if(window.__PRESELECTED__.academicId){
      academic.value = String(window.__PRESELECTED__.academicId);
    }
    populateDepartments();
    if(window.__PRESELECTED__.departmentId){
      department.value = String(window.__PRESELECTED__.departmentId);
    }
    populateGrades();
    if(window.__PRESELECTED__.grade){
      grade.value = String(window.__PRESELECTED__.grade);
    }
  }
  populateCourses();

  // 預覽
  btnPreview?.addEventListener('click', ()=>{
    const val = (comment.value || '').trim();
    if(!val){ alert('請先輸入評論內容'); return; }
    preview.classList.remove('d-none');
    previewText.textContent = val;
    preview.scrollIntoView({behavior:'smooth', block:'center'});
  });

  // 送出
  btnSubmit?.addEventListener('click', async ()=>{
    const cId = course.value;
    const text = (comment.value || '').trim();
    const star = parseInt(rating.value, 10);
    if(!cId){ alert('請先選擇課程'); return; }
    if(!text){ alert('評論內容不能為空'); return; }
    if(!(star >=1 && star <=5)){ alert('評分必須是 1–5'); return; }

    const url = `/add_comment/${cId}/submit/`;
    try{
      btnSubmit.disabled = true;
      btnSubmit.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 送出中…';
      const res = await fetch(url, {
        method: 'POST',
        headers: {'Content-Type':'application/json', 'X-Requested-With':'XMLHttpRequest'},
        body: JSON.stringify({ content: text, rating: star })
      });
      if(!res.ok){
        const e = await res.json().catch(()=>({error:`HTTP ${res.status}`}));
        throw new Error(e.error || '送出失敗');
      }
      const data = await res.json();
      alert('評論送出成功！');
      // 導回評論列表或課程頁（依你的路由調整）
      window.location.href = '/comment/';
    }catch(err){
      console.error(err);
      alert(err.message || '送出失敗，請稍後再試');
    }finally{
      btnSubmit.disabled = false;
      btnSubmit.innerHTML = '<i class="fa-regular fa-paper-plane"></i> 送出';
    }
  });
});
})();