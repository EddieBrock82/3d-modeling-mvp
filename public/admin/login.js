import { supabase } from '../supabaseClient';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const errorMessage = document.getElementById('error-message');

    // 로그인 상태 확인
    checkAuth();

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        try {
            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (error) throw error;

            // 관리자 권한 확인
            const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();

            if (profileError) throw profileError;

            if (profile.role !== 'admin') {
                throw new Error('관리자 권한이 없습니다.');
            }

            // 로그인 성공 시 대시보드로 이동
            window.location.href = '/admin/dashboard.html';
        } catch (error) {
            errorMessage.textContent = error.message;
            errorMessage.style.display = 'block';
        }
    });
});

async function checkAuth() {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (session) {
        // 이미 로그인된 상태면 관리자 페이지로 이동
        window.location.href = '/admin';
    }
} 