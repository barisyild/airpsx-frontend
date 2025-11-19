import { h } from "preact";
import { useState, useEffect } from "preact/hooks";
import ApiService from "../../services/ApiService";
import "./Profiles.css";

interface ProfilesProps {
  isDarkMode: boolean;
}

interface Profile {
  profileId: string;
  username: string;
}

const Profiles = ({ isDarkMode }: ProfilesProps) => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const fetchProfiles = async () => {
      try {
        const data = await ApiService.getProfileList();
        setProfiles(data);
        setError(null);
      } catch (err) {
        console.error("Profiles yüklenemedi:", err);
        setError("Failed to load profiles");
      } finally {
        setLoading(false);
      }
    };

    fetchProfiles();
  }, []);

  const handleProfileClick = (profile: Profile) => {
    setSelectedProfile(profile);
  };

  const handleBackup = async (profileId: string | null = null) => {
    try {
      await ApiService.downloadBackup(profileId);
    } catch (error) {
      console.error("Backup failed:", error);
    }
  };

  return (
    <div className={`profiles ${isDarkMode ? "dark" : ""}`}>
      {loading ? (
        <div className="profiles-loading">Loading profiles...</div>
      ) : error ? (
        <div className="profiles-error">{error}</div>
      ) : (
        <>
          <div className="profiles-header">
            <h2>User Profiles</h2>
            <button
              className="backup-all-button"
              onClick={() => handleBackup()}
            >
              <span className="icon">💾</span>
              Save All Profile Backup Files
            </button>
          </div>
          <div className="profile-grid">
            {profiles.map((profile) => (
              <div
                key={profile.profileId}
                className="profile-item"
                onClick={() => handleProfileClick(profile)}
              >
                <div className="profile-icon">
                  <img
                    src={ApiService.getProfileImageUrl(profile.profileId)}
                    alt={profile.username}
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src =
                        'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
                      target.style.background = "#2c3e50";
                    }}
                  />
                </div>
                <div className="profile-name">{profile.username}</div>
              </div>
            ))}
          </div>

          {selectedProfile && (
            <div
              className="profile-details-overlay"
              onClick={() => setSelectedProfile(null)}
            >
              <div
                className="profile-details"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="profile-details-header">
                  <h2>{selectedProfile.username}</h2>
                  <button onClick={() => setSelectedProfile(null)}>×</button>
                </div>
                <div className="profile-details-content">
                  <div className="profile-details-icon">
                    <img
                      src={ApiService.getProfileImageUrl(
                        selectedProfile.profileId
                      )}
                      alt={selectedProfile.username}
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src =
                          'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>';
                        target.style.background = "#2c3e50";
                      }}
                    />
                  </div>
                  <div className="profile-details-info">
                    <div className="detail-row">
                      <span>Username:</span>
                      <span>{selectedProfile.username}</span>
                    </div>
                    <div className="detail-row">
                      <span>Profile ID:</span>
                      <span>{selectedProfile.profileId}</span>
                    </div>
                    <div className="detail-actions">
                      <button
                        className="backup-button icon"
                        onClick={() => handleBackup(selectedProfile.profileId)}
                      >
                        Backup Save Files
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Profiles;

