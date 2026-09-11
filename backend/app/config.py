from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    bridge_api_key: str
    allowed_origins: str = "http://localhost:5173"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
