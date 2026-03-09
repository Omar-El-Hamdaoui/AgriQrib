# backend/main.py
# FastAPI — endpoints d'authentification Terroir Direct
#
# Stack :
#   - FastAPI           : framework HTTP
#   - Supabase Python   : client Auth + DB (pip install supabase)
#   - python-jose       : lecture du JWT Supabase pour /me
#   - python-dotenv     : variables d'environnement
#
# Variables d'environnement requises (.env) :
#   SUPABASE_URL=https://xxxx.supabase.co
#   SUPABASE_SERVICE_KEY=service_role_key   # clé service (jamais exposée au client)
#   COOKIE_DOMAIN=localhost                 # domaine du cookie
#   FRONTEND_URL=http://localhost:3000      # pour CORS (CRA)

import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Response, Cookie, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr, field_validator
from supabase import create_client, Client
from typing import Optional

load_dotenv()

# ── Supabase client (service role — côté serveur uniquement) ──────────────────
supabase: Client = create_client(
    os.environ["SUPABASE_URL"],
    os.environ["SUPABASE_SERVICE_KEY"],
)

# ── App ───────────────────────────────────────────────────────────────────────
app = FastAPI(title="Terroir Direct API")

# Liste explicite des origines autorisées
# Inclut CRA (3000) et Vite (5173) pour couvrir les deux cas
_frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")
_allowed_origins = list({_frontend_url, "http://localhost:3000", "http://localhost:3001"})

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_credentials=True,   # obligatoire pour les cookies cross-origin
    allow_methods=["*"],
    allow_headers=["*"],
)

COOKIE_NAME   = "td_session"
COOKIE_DOMAIN = os.getenv("COOKIE_DOMAIN", "localhost")
IS_PROD       = os.getenv("ENV", "development") == "production"

# ── Schémas Pydantic (miroir du registerValidation.js) ───────────────────────

class UserCreate(BaseModel):
    email:      EmailStr
    password:   str
    role:       str   # buyer_individual | buyer_restaurant | buyer_transit | producer
    first_name: str
    last_name:  str
    phone:      Optional[str] = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, v):
        allowed = {"producer", "buyer_individual", "buyer_restaurant", "buyer_transit"}
        if v not in allowed:
            raise ValueError(f"Rôle invalide. Valeurs acceptées : {allowed}")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        import re
        if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$', v):
            raise ValueError("Mot de passe trop faible (8 car. min, 1 maj, 1 min, 1 chiffre).")
        return v


class FarmCreate(BaseModel):
    farm_name:            str
    description:          Optional[str]  = None
    address:              str
    city:                 str
    postal_code:          str
    certifications:       list[str]      = []
    delivery_radius_km:   int            = 50
    minimum_order_amount: float          = 0.0


class RegisterPayload(BaseModel):
    user: UserCreate
    farm: Optional[FarmCreate] = None


class LoginPayload(BaseModel):
    email:    EmailStr
    password: str


# ── Helper : poser le cookie httpOnly ────────────────────────────────────────

def set_auth_cookie(response: Response, access_token: str, refresh_token: str):
    """
    Pose deux cookies httpOnly :
      - td_session        : access token (durée courte, 1h)
      - td_refresh        : refresh token (durée longue, 7j)
    Le JS ne peut pas lire ces cookies (httpOnly).
    secure=True en production (HTTPS uniquement).
    """
    response.set_cookie(
        key=COOKIE_NAME,
        value=access_token,
        httponly=True,
        secure=IS_PROD,
        samesite="strict",
        domain=COOKIE_DOMAIN,
        max_age=3600,          # 1 heure
        path="/",
    )
    response.set_cookie(
        key="td_refresh",
        value=refresh_token,
        httponly=True,
        secure=IS_PROD,
        samesite="strict",
        domain=COOKIE_DOMAIN,
        max_age=60 * 60 * 24 * 7,  # 7 jours
        path="/auth/refresh",       # accessible uniquement pour le refresh
    )


def clear_auth_cookies(response: Response):
    response.delete_cookie(COOKIE_NAME,    domain=COOKIE_DOMAIN, path="/")
    response.delete_cookie("td_refresh",   domain=COOKIE_DOMAIN, path="/auth/refresh")


# ── Helper : récupérer l'utilisateur depuis le cookie ───────────────────────

def get_current_user(td_session: Optional[str] = Cookie(None)):
    if not td_session:
        raise HTTPException(status_code=401, detail="Non authentifié.")
    try:
        result = supabase.auth.get_user(td_session)
        return result.user
    except Exception:
        raise HTTPException(status_code=401, detail="Session expirée ou invalide.")


# ── POST /auth/register ──────────────────────────────────────────────────────

@app.post("/auth/register", status_code=201)
async def register(payload: RegisterPayload, response: Response):
    user_data = payload.user
    farm_data = payload.farm

    # 1. Créer l'utilisateur dans Supabase Auth
    try:
        auth_response = supabase.auth.admin.create_user({
            "email":          user_data.email,
            "password":       user_data.password,
            "email_confirm":  True,    # confirme immédiatement (pas de blocage connexion)
        })
    except Exception as e:
        msg = str(e).lower()
        if "already registered" in msg or "already exists" in msg:
            raise HTTPException(status_code=409, detail="Cette adresse email est déjà utilisée.")
        raise HTTPException(status_code=500, detail=f"Erreur Supabase Auth : {e}")

    supabase_uid = auth_response.user.id

    # 2. Insérer le profil étendu dans la table `users`
    try:
        supabase.table("users").insert({
            "id":         supabase_uid,   # même UUID que Supabase Auth
            "email":      user_data.email,
            "role":       user_data.role,
            "first_name": user_data.first_name,
            "last_name":  user_data.last_name,
            "phone":      user_data.phone,
        }).execute()
    except Exception as e:
        # Rollback Auth si l'insert échoue
        supabase.auth.admin.delete_user(supabase_uid)
        raise HTTPException(status_code=500, detail=f"Erreur création profil : {e}")

    # 3. Insérer la ferme si producteur
    farm_profile = None
    if user_data.role == "producer":
        if not farm_data:
            supabase.auth.admin.delete_user(supabase_uid)
            raise HTTPException(status_code=422, detail="Les informations de la ferme sont requises pour un producteur.")
        try:
            farm_result = supabase.table("farms").insert({
                "user_id":              supabase_uid,
                "farm_name":            farm_data.farm_name,
                "description":          farm_data.description,
                "address":              farm_data.address,
                "city":                 farm_data.city,
                "postal_code":          farm_data.postal_code,
                "certifications":       farm_data.certifications,
                "delivery_radius_km":   farm_data.delivery_radius_km,
                "minimum_order_amount": farm_data.minimum_order_amount,
            }).execute()
            farm_profile = farm_result.data[0] if farm_result.data else None
        except Exception as e:
            supabase.auth.admin.delete_user(supabase_uid)
            raise HTTPException(status_code=500, detail=f"Erreur création ferme : {e}")

    # 4. Ouvrir une session pour récupérer les tokens
    try:
        session_response = supabase.auth.sign_in_with_password({
            "email":    user_data.email,
            "password": user_data.password,
        })
        access_token  = session_response.session.access_token
        refresh_token = session_response.session.refresh_token
    except Exception as e:
        # L'inscription a réussi mais la session a échoué — pas bloquant
        # L'utilisateur devra se connecter manuellement
        return {
            "user": {
                "id":         supabase_uid,
                "email":      user_data.email,
                "role":       user_data.role,
                "first_name": user_data.first_name,
                "last_name":  user_data.last_name,
                "phone":      user_data.phone,
                "is_verified": False,
            },
            "farm":    farm_profile,
            "session": None,
        }

    # 5. Poser le cookie httpOnly
    set_auth_cookie(response, access_token, refresh_token)

    return {
        "user": {
            "id":          supabase_uid,
            "email":       user_data.email,
            "role":        user_data.role,
            "firstName":   user_data.first_name,
            "lastName":    user_data.last_name,
            "phone":       user_data.phone,
            "isVerified":  False,
        },
        "farm": farm_profile,
    }


# ── POST /auth/login ─────────────────────────────────────────────────────────

@app.post("/auth/login")
async def login(payload: LoginPayload, response: Response):
    try:
        session_response = supabase.auth.sign_in_with_password({
            "email":    payload.email,
            "password": payload.password,
        })
    except Exception:
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect.")

    uid = session_response.user.id

    # Récupérer le profil étendu
    profile_result = supabase.table("users").select("*").eq("id", uid).single().execute()
    if not profile_result.data:
        raise HTTPException(status_code=404, detail="Profil utilisateur introuvable.")

    profile = profile_result.data

    # Récupérer la ferme si producteur
    farm = None
    if profile["role"] == "producer":
        farm_result = supabase.table("farms").select("*").eq("user_id", uid).single().execute()
        farm = farm_result.data

    set_auth_cookie(response, session_response.session.access_token, session_response.session.refresh_token)

    return {
        "user": {
            "id":         profile["id"],
            "email":      profile["email"],
            "role":       profile["role"],
            "firstName":  profile["first_name"],
            "lastName":   profile["last_name"],
            "phone":      profile.get("phone"),
            "isVerified": profile.get("is_verified", False),
        },
        "farm": farm,
    }


# ── POST /auth/logout ────────────────────────────────────────────────────────

@app.post("/auth/logout", status_code=204)
async def logout(response: Response, td_session: Optional[str] = Cookie(None)):
    if td_session:
        try:
            supabase.auth.admin.sign_out(td_session)
        except Exception:
            pass  # On supprime le cookie même si Supabase échoue
    clear_auth_cookies(response)
    return None


# ── GET /auth/me ─────────────────────────────────────────────────────────────

@app.get("/auth/me")
async def me(td_session: Optional[str] = Cookie(None)):
    if not td_session:
        raise HTTPException(status_code=401, detail="Non authentifié.")

    # Valider le token auprès de Supabase
    try:
        user_response = supabase.auth.get_user(td_session)
        uid = user_response.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Session expirée.")

    # Renvoyer le profil complet
    profile_result = supabase.table("users").select("*").eq("id", uid).single().execute()
    if not profile_result.data:
        raise HTTPException(status_code=404, detail="Profil introuvable.")

    profile = profile_result.data
    farm    = None

    if profile["role"] == "producer":
        farm_result = supabase.table("farms").select("*").eq("user_id", uid).single().execute()
        farm = farm_result.data

    return {
        "id":         profile["id"],
        "email":      profile["email"],
        "role":       profile["role"],
        "firstName":  profile["first_name"],
        "lastName":   profile["last_name"],
        "phone":      profile.get("phone"),
        "isVerified": profile.get("is_verified", False),
        "farm":       farm,
    }


# ── POST /auth/refresh ───────────────────────────────────────────────────────

@app.post("/auth/refresh")
async def refresh_session(response: Response, td_refresh: Optional[str] = Cookie(None)):
    if not td_refresh:
        raise HTTPException(status_code=401, detail="Refresh token absent.")
    try:
        result = supabase.auth.refresh_session(td_refresh)
        set_auth_cookie(response, result.session.access_token, result.session.refresh_token)
        return {"ok": True}
    except Exception:
        clear_auth_cookies(response)
        raise HTTPException(status_code=401, detail="Session expirée. Veuillez vous reconnecter.")


# ── POST /auth/forgot-password ───────────────────────────────────────────────
# Envoie un email de réinitialisation si l'email existe.
# Retourne TOUJOURS 200 — ne révèle jamais si l'email est connu ou non.

class ForgotPasswordPayload(BaseModel):
    email: EmailStr
    redirect_url: str = "http://localhost:3000/reset-password"


@app.post("/auth/forgot-password", status_code=200)
async def forgot_password(payload: ForgotPasswordPayload):
    try:
        supabase.auth.reset_password_for_email(
            payload.email,
            options={"redirect_to": payload.redirect_url},
        )
    except Exception:
        # On absorbe l'erreur silencieusement pour ne pas révéler
        # si l'adresse email est enregistrée ou non.
        pass
    # Toujours la même réponse, qu'il y ait un compte ou non
    return {"ok": True}


# ── POST /auth/reset-password ────────────────────────────────────────────────
# Appelé depuis ResetPasswordPage après que l'utilisateur a cliqué
# sur le lien Supabase. Le token de recovery est dans l'URL (#access_token=...).
# Le frontend l'extrait et l'envoie ici.

class ResetPasswordPayload(BaseModel):
    access_token: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v):
        import re
        if not re.match(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$', v):
            raise ValueError("Mot de passe trop faible (8 car. min, 1 maj, 1 min, 1 chiffre).")
        return v


@app.post("/auth/reset-password", status_code=200)
async def reset_password(payload: ResetPasswordPayload, response: Response):
    try:
        # 1. Vérifier le token de recovery et obtenir l'uid
        user_response = supabase.auth.get_user(payload.access_token)
        uid = user_response.user.id
    except Exception:
        raise HTTPException(status_code=401, detail="Lien de réinitialisation invalide ou expiré.")

    try:
        # 2. Mettre à jour le mot de passe via l'API admin
        supabase.auth.admin.update_user_by_id(
            uid,
            {"password": payload.new_password},
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erreur lors de la mise à jour : {e}")

    # 3. Ouvrir une session immédiatement pour connecter l'utilisateur
    try:
        profile_result = supabase.table("users").select("*").eq("id", uid).single().execute()
        profile = profile_result.data

        farm = None
        if profile and profile.get("role") == "producer":
            farm_result = supabase.table("farms").select("*").eq("user_id", uid).single().execute()
            farm = farm_result.data

        # Re-signer pour obtenir un nouveau access token propre
        sign_in = supabase.auth.admin.create_session(uid)
        set_auth_cookie(response, sign_in.session.access_token, sign_in.session.refresh_token)

        return {
            "ok": True,
            "user": {
                "id":        profile["id"],
                "email":     profile["email"],
                "role":      profile["role"],
                "firstName": profile["first_name"],
                "lastName":  profile["last_name"],
                "phone":     profile.get("phone"),
                "isVerified": profile.get("is_verified", False),
            },
            "farm": farm,
        }
    except Exception:
        # Mot de passe changé mais session non créée — pas bloquant
        return {"ok": True, "user": None}