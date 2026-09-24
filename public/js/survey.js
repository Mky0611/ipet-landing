/**
 * iPet Customer Survey & Feature Suggestion Module
 */

document.addEventListener('DOMContentLoaded', () => {
  const surveyForm = document.getElementById('customer-survey-form');
  const surveyResult = document.getElementById('survey-result-msg');

  if (surveyForm) {
    surveyForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const customerName = document.getElementById('survey-name')?.value || '';
      const phoneOrEmail = document.getElementById('survey-contact')?.value || '';
      const featureWish = document.querySelector('input[name="survey_feature"]:checked')?.value || 'Khác';
      const useCase = document.querySelector('input[name="survey_usecase"]:checked')?.value || 'Bàn làm việc';
      const targetPrice = document.getElementById('survey-price')?.value || '';
      const suggestions = document.getElementById('survey-suggestions')?.value || '';

      const submitBtn = surveyForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      try {
        const res = await fetch('/api/survey', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerName,
            phoneOrEmail,
            featureWish,
            useCase,
            targetPrice,
            suggestions
          })
        });

        const data = await res.json();
        if (data.success) {
          if (surveyResult) {
            surveyResult.style.display = 'block';
            surveyResult.innerHTML = `
              <div class="alert-success" style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #34d399; padding: 1rem; border-radius: 12px; text-align: center;">
                <h4 style="margin-bottom: 0.25rem;">✓ Cảm ơn bạn đã tham gia khảo sát!</h4>
                <p style="font-size: 0.88rem;">Ý kiến quý báu của bạn giúp đội ngũ iPet hoàn thiện robot tốt hơn mỗi ngày.</p>
              </div>
            `;
          }
          surveyForm.reset();
          if (window.motionSystem) window.motionSystem.playHaptic('happy');
        } else {
          alert(data.error || 'Có lỗi xảy ra, vui lòng thử lại.');
        }
      } catch (err) {
        alert('Không thể kết nối đến máy chủ.');
      } finally {
        if (submitBtn) submitBtn.disabled = false;
      }
    });
  }
});
