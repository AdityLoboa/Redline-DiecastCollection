/* =========================================================
   REDLINE GARAGE
   SUPABASE AUTHENTICATION
========================================================= */

let redlineAuthClient = null;


/* =========================================================
   ELEMENTS
========================================================= */

const loginPanel =
    document.getElementById("loginPanel");

const signupPanel =
    document.getElementById("signupPanel");

const showSignup =
    document.getElementById("showSignup");

const showLogin =
    document.getElementById("showLogin");

const loginForm =
    document.getElementById("loginForm");

const signupForm =
    document.getElementById("signupForm");

const loginMessage =
    document.getElementById("loginMessage");

const signupMessage =
    document.getElementById("signupMessage");

const loginButton =
    document.getElementById("loginButton");

const signupButton =
    document.getElementById("signupButton");

const forgotPassword =
    document.getElementById("forgotPassword");

const signupPassword =
    document.getElementById("signupPassword");

const signupConfirm =
    document.getElementById("signupConfirm");


/* =========================================================
   MESSAGE
========================================================= */

function showMessage(
    element,
    message,
    type = "error"
) {

    if (!element) {
        return;
    }

    element.textContent = message;

    element.classList.remove(
        "success",
        "error"
    );

    element.classList.add(type);

}


/* =========================================================
   INITIALIZE SUPABASE
========================================================= */

function initializeRedlineAuth() {

    if (
        window.redlineSupabase &&
        window.redlineSupabase.auth
    ) {

        redlineAuthClient =
            window.redlineSupabase;

        console.log(
            "✅ Redline Garage: Supabase connected"
        );

        checkExistingSession();

        return true;
    }

    return false;
}


/* =========================================================
   WAIT FOR SUPABASE
========================================================= */

if (!initializeRedlineAuth()) {

    const waitForSupabase =
        setInterval(() => {

            if (initializeRedlineAuth()) {

                clearInterval(
                    waitForSupabase
                );

            }

        }, 100);


    setTimeout(() => {

        clearInterval(
            waitForSupabase
        );

        if (!redlineAuthClient) {

            console.error(
                "❌ Supabase could not be initialized."
            );

            showMessage(
                loginMessage,
                "Account server is unavailable. Check your Supabase configuration."
            );

            showMessage(
                signupMessage,
                "Account server is unavailable. Check your Supabase configuration."
            );

        }

    }, 10000);

}


/* =========================================================
   SWITCH TO SIGNUP
========================================================= */

showSignup?.addEventListener(
    "click",
    () => {

        loginPanel?.classList.add("hidden");

        signupPanel?.classList.remove("hidden");

        if (loginMessage) {
            loginMessage.textContent = "";
        }

        if (signupMessage) {
            signupMessage.textContent = "";
        }

    }
);


/* =========================================================
   SWITCH TO LOGIN
========================================================= */

showLogin?.addEventListener(
    "click",
    () => {

        signupPanel?.classList.add("hidden");

        loginPanel?.classList.remove("hidden");

        if (loginMessage) {
            loginMessage.textContent = "";
        }

        if (signupMessage) {
            signupMessage.textContent = "";
        }

    }
);


/* =========================================================
   LOGIN
========================================================= */

loginForm?.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        if (!redlineAuthClient) {

            showMessage(
                loginMessage,
                "Account connection is not ready."
            );

            return;
        }


        const email =
            document
                .getElementById("loginEmail")
                ?.value
                .trim()
                .toLowerCase();


        const password =
            document
                .getElementById("loginPassword")
                ?.value;


        if (!email || !password) {

            showMessage(
                loginMessage,
                "Please enter your email and password."
            );

            return;
        }


        loginButton.disabled = true;

        loginButton.textContent =
            "SIGNING IN...";


        showMessage(
            loginMessage,
            "Signing in...",
            "success"
        );


        try {

            const {
                data,
                error
            } =
                await redlineAuthClient.auth
                    .signInWithPassword({

                        email,
                        password

                    });


            if (error) {

                console.error(
                    "Login error:",
                    error
                );

                showMessage(
                    loginMessage,
                    getFriendlyAuthError(error)
                );

                return;
            }


            if (!data?.session) {

                showMessage(
                    loginMessage,
                    "Login completed, but no active session was created."
                );

                return;
            }


            showMessage(
                loginMessage,
                "Login successful. Opening your garage...",
                "success"
            );


            setTimeout(() => {

                window.location.href =
                    "A3.html";

            }, 700);


        } catch (error) {

            console.error(
                "Login exception:",
                error
            );

            showMessage(
                loginMessage,
                "Could not connect to the account server."
            );

        } finally {

            loginButton.disabled = false;

            loginButton.textContent =
                "ENTER GARAGE";

        }

    }
);


/* =========================================================
   SIGNUP
========================================================= */

signupForm?.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        if (!redlineAuthClient) {

            showMessage(
                signupMessage,
                "Account connection is not ready."
            );

            return;
        }


        const name =
            document
                .getElementById("signupName")
                ?.value
                .trim();


        const username =
            document
                .getElementById("signupUsername")
                ?.value
                .trim()
                .toLowerCase();


        const email =
            document
                .getElementById("signupEmail")
                ?.value
                .trim()
                .toLowerCase();


        const password =
            document
                .getElementById("signupPassword")
                ?.value;


        const confirmPassword =
            document
                .getElementById("signupConfirm")
                ?.value;


        /* =========================================
           VALIDATION
        ========================================= */

        if (
            !name ||
            !username ||
            !email ||
            !password ||
            !confirmPassword
        ) {

            showMessage(
                signupMessage,
                "Please complete all fields."
            );

            return;
        }


        if (!/^[a-zA-Z0-9_]+$/.test(username)) {

            showMessage(
                signupMessage,
                "Username can only contain letters, numbers, and underscores."
            );

            return;
        }


        if (username.length < 3) {

            showMessage(
                signupMessage,
                "Username must contain at least 3 characters."
            );

            return;
        }


        if (password.length < 8) {

            showMessage(
                signupMessage,
                "Password must contain at least 8 characters."
            );

            return;
        }


        if (password !== confirmPassword) {

            showMessage(
                signupMessage,
                "Passwords do not match."
            );

            return;
        }


        signupButton.disabled = true;

        signupButton.textContent =
            "CREATING ACCOUNT...";


        showMessage(
            signupMessage,
            "Creating your garage account...",
            "success"
        );


        try {

            /* =========================================
               CREATE AUTH ACCOUNT
            ========================================= */

            const {
                data,
                error
            } =
                await redlineAuthClient.auth
                    .signUp({

                        email,

                        password,

                        options: {

                            data: {

                                display_name:
                                    name,

                                username:
                                    username

                            }

                        }

                    });


            if (error) {

                console.error(
                    "Signup error:",
                    error
                );

                showMessage(
                    signupMessage,
                    getFriendlyAuthError(error)
                );

                return;
            }


            if (!data?.user) {

                showMessage(
                    signupMessage,
                    "The account could not be created."
                );

                return;
            }


            console.log(
                "✅ Account created:",
                data.user.id
            );


            /* =========================================
               CREATE PROFILE
            ========================================= */

            if (data.session) {

                await createProfile(
                    data.user.id,
                    username,
                    name
                );

            }


            /* =========================================
               EMAIL CONFIRMATION
            ========================================= */

            if (!data.session) {

                showMessage(
                    signupMessage,
                    "Account created. Please check your email and confirm your account.",
                    "success"
                );

                return;
            }


            /* =========================================
               REDIRECT
            ========================================= */

            showMessage(
                signupMessage,
                "Account created successfully. Opening your garage...",
                "success"
            );


            setTimeout(() => {

                window.location.href =
                    "A3.html";

            }, 900);


        } catch (error) {

            console.error(
                "Signup exception:",
                error
            );

            showMessage(
                signupMessage,
                "Could not create the account."
            );

        } finally {

            signupButton.disabled = false;

            signupButton.textContent =
                "CREATE ACCOUNT";

        }

    }
);


/* =========================================================
   CREATE PROFILE
========================================================= */

async function createProfile(
    userId,
    username,
    displayName
) {

    if (!redlineAuthClient) {
        return;
    }


    try {

        const {
            error
        } =
            await redlineAuthClient
                .from("profiles")
                .upsert(

                    {

                        id:
                            userId,

                        username:
                            username,

                        display_name:
                            displayName

                    },

                    {

                        onConflict:
                            "id"

                    }

                );


        if (error) {

            console.warn(
                "Profile creation warning:",
                error.message
            );

            return;
        }


        console.log(
            "✅ Profile created"
        );


    } catch (error) {

        console.warn(
            "Profile creation exception:",
            error
        );

    }

}


/* =========================================================
   EXISTING SESSION
========================================================= */

async function checkExistingSession() {

    if (!redlineAuthClient) {
        return;
    }


    try {

        const {
            data,
            error
        } =
            await redlineAuthClient.auth
                .getSession();


        if (error) {

            console.error(
                "Session error:",
                error
            );

            return;
        }


        if (data?.session) {

            console.log(
                "✅ Existing session found"
            );

            window.location.href =
                "A3.html";

        }

    } catch (error) {

        console.error(
            "Session check exception:",
            error
        );

    }

}


/* =========================================================
   FORGOT PASSWORD
========================================================= */

forgotPassword?.addEventListener(
    "click",
    async function () {

        if (!redlineAuthClient) {

            showMessage(
                loginMessage,
                "Account connection is not ready."
            );

            return;
        }


        const email =
            document
                .getElementById("loginEmail")
                ?.value
                .trim()
                .toLowerCase();


        if (!email) {

            showMessage(
                loginMessage,
                "Enter your email address first."
            );

            return;
        }


        try {

            /*
               Reset password page should be located
               in the same folder as auth.html.
            */

            const resetURL =
                window.location.origin +
                window.location.pathname
                    .substring(
                        0,
                        window.location.pathname
                            .lastIndexOf("/")
                    ) +
                "/reset-password.html";


            const {
                error
            } =
                await redlineAuthClient.auth
                    .resetPasswordForEmail(
                        email,
                        {
                            redirectTo:
                                resetURL
                        }
                    );


            if (error) {

                showMessage(
                    loginMessage,
                    getFriendlyAuthError(error)
                );

                return;
            }


            showMessage(
                loginMessage,
                "Password reset email sent. Check your inbox.",
                "success"
            );


        } catch (error) {

            console.error(
                "Password reset error:",
                error
            );

            showMessage(
                loginMessage,
                "Could not send the password reset email."
            );

        }

    }
);


/* =========================================================
   PASSWORD MATCH
========================================================= */

function validatePasswords() {

    if (
        !signupPassword ||
        !signupConfirm
    ) {
        return;
    }


    if (
        signupConfirm.value &&
        signupPassword.value !==
        signupConfirm.value
    ) {

        signupConfirm.setCustomValidity(
            "Passwords do not match."
        );

    } else {

        signupConfirm.setCustomValidity("");

    }

}


signupPassword?.addEventListener(
    "input",
    validatePasswords
);


signupConfirm?.addEventListener(
    "input",
    validatePasswords
);


/* =========================================================
   FRIENDLY AUTH ERRORS
========================================================= */

function getFriendlyAuthError(error) {

    const message =
        error?.message || "";


    const lower =
        message.toLowerCase();


    if (
        lower.includes(
            "invalid login credentials"
        )
    ) {

        return "Incorrect email or password.";

    }


    if (
        lower.includes(
            "email not confirmed"
        )
    ) {

        return "Please confirm your email before logging in.";

    }


    if (
        lower.includes(
            "user already registered"
        )
    ) {

        return "An account with this email already exists.";

    }


    if (
        lower.includes(
            "password should be at least"
        )
    ) {

        return "Your password is too short.";

    }


    if (
        lower.includes(
            "rate limit"
        )
    ) {

        return "Too many attempts. Please wait and try again.";

    }


    if (
        lower.includes(
            "email address"
        ) &&
        lower.includes(
            "invalid"
        )
    ) {

        return "Please enter a valid email address.";

    }


    return (
        message ||
        "Something went wrong. Please try again."
    );

}


console.log(
    "🚗 Redline Garage authentication loaded"
);