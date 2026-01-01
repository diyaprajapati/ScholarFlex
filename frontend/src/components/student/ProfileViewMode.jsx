import React from 'react'

export default function ProfileViewMode({ formData, domains, getDomainName, formatDate }) {
  return (
    <div className="space-y-6">
      {/* Section 1: Identity & Contact */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          Identity & Contact
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Profile Image</label>
            {formData.imageUrl ? (
              <img
                src={(() => {
                  if (formData.imageUrl.startsWith('http') || formData.imageUrl.startsWith('blob:')) {
                    return formData.imageUrl
                  }
                  // Handle both /uploads/ prefix and /scholarflex/ or /students/ paths (which need /uploads/ prepended)
                  let filePath = formData.imageUrl;
                  if (formData.imageUrl.startsWith('/scholarflex/') || formData.imageUrl.startsWith('/students/')) {
                    filePath = `/uploads${formData.imageUrl}`;
                  } else if (!formData.imageUrl.startsWith('/uploads/')) {
                    filePath = `/uploads${formData.imageUrl}`;
                  }
                  const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace('/api', '')
                  return `${baseUrl}${filePath}`
                })()}
                alt="Profile"
                className="w-24 h-24 rounded-full object-cover border-2 border-gray-300"
              />
            ) : (
              <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center">
                <span className="text-gray-400 text-xs">No Image</span>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
            <p className="text-gray-900">{formData.fullName || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email ID</label>
            <p className="text-gray-900">{formData.email || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <p className="text-gray-900">{formData.phone || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Section 2: Education Details */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          Education Details
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">College Name</label>
            <p className="text-gray-900">{formData.instituteName || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Degree</label>
            <p className="text-gray-900">{formData.courseTaken || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Year</label>
            <p className="text-gray-900">{formData.currentYear || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Current Semester</label>
            <p className="text-gray-900">{formData.currentSemester || 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Graduation Year</label>
            <p className="text-gray-900">{formData.graduationYear || 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Section 3: Internship Information */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          Internship Information
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Domain</label>
            <p className="text-gray-900">{getDomainName(formData.domainId)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Internship Start Date</label>
            <p className="text-gray-900">{formData.internshipStartDate ? formatDate(formData.internshipStartDate) : 'N/A'}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Internship End Date</label>
            <p className="text-gray-900">{formData.internshipEndDate ? formatDate(formData.internshipEndDate) : 'N/A'}</p>
          </div>
        </div>
      </div>

      {/* Section 4: Skills */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          Skills
        </h2>
        
        <div className="space-y-4">
          {formData.skills?.languages && formData.skills.languages.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Programming Languages</label>
              <div className="flex flex-wrap gap-2">
                {formData.skills.languages.map((skill, index) => (
                  <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">{skill}</span>
                ))}
              </div>
            </div>
          )}
          {formData.skills?.frameworks && formData.skills.frameworks.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Frameworks / Libraries</label>
              <div className="flex flex-wrap gap-2">
                {formData.skills.frameworks.map((skill, index) => (
                  <span key={index} className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">{skill}</span>
                ))}
              </div>
            </div>
          )}
          {formData.skills?.tools && formData.skills.tools.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tools / Technologies</label>
              <div className="flex flex-wrap gap-2">
                {formData.skills.tools.map((skill, index) => (
                  <span key={index} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">{skill}</span>
                ))}
              </div>
            </div>
          )}
          {formData.skills?.softSkills && formData.skills.softSkills.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Soft Skills</label>
              <div className="flex flex-wrap gap-2">
                {formData.skills.softSkills.map((skill, index) => (
                  <span key={index} className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">{skill}</span>
                ))}
              </div>
            </div>
          )}
          {(!formData.skills?.languages || formData.skills.languages.length === 0) &&
           (!formData.skills?.frameworks || formData.skills.frameworks.length === 0) &&
           (!formData.skills?.tools || formData.skills.tools.length === 0) &&
           (!formData.skills?.softSkills || formData.skills.softSkills.length === 0) && (
            <p className="text-gray-500 text-sm">No skills added yet.</p>
          )}
        </div>
      </div>

      {/* Section 5: Personal Projects */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          Personal Projects
        </h2>
        
        {formData.personalProjects && formData.personalProjects.length > 0 ? (
          <div className="space-y-4">
            {formData.personalProjects.map((project, index) => (
              <div key={index} className="border border-gray-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2">{project.projectTitle || project.title || `Project ${index + 1}`}</h3>
                <p className="text-gray-700 text-sm mb-2">{project.description || 'No description'}</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Tech Stack: </span>
                    <span className="text-gray-600">{project.techStack || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Role: </span>
                    <span className="text-gray-600">{project.role || 'N/A'}</span>
                  </div>
                  {(project.githubLink || project.github) && (
                    <div>
                      <span className="font-medium text-gray-700">GitHub: </span>
                      <a href={project.githubLink || project.github} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                        View Repository
                      </a>
                    </div>
                  )}
                  {(project.liveLink || project.live) && (
                    <div>
                      <span className="font-medium text-gray-700">Live Link: </span>
                      <a href={project.liveLink || project.live} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline">
                        View Project
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No projects added yet.</p>
        )}
      </div>

      {/* Section 6: Achievements */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          Achievements & Certifications
        </h2>
        
        <div className="space-y-4">
          {['hackathons', 'certifications', 'awards', 'competitions'].map((type) => (
            formData.achievements?.[type] && formData.achievements[type].length > 0 && (
              <div key={type}>
                <label className="block text-sm font-medium text-gray-700 mb-2 capitalize">{type}</label>
                <div className="space-y-3">
                  {formData.achievements[type].map((achievement, index) => (
                    <div key={index} className="border border-gray-200 rounded-lg p-3">
                      <h4 className="font-semibold text-gray-900">{achievement.title}</h4>
                      {achievement.issuer && <p className="text-sm text-gray-600">Issuer: {achievement.issuer}</p>}
                      {achievement.description && <p className="text-sm text-gray-700 mt-1">{achievement.description}</p>}
                      {achievement.date && <p className="text-xs text-gray-500 mt-1">Date: {formatDate(achievement.date)}</p>}
                      {achievement.link && (
                        <a href={achievement.link} target="_blank" rel="noopener noreferrer" className="text-green-600 hover:underline text-sm">
                          View Details
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          ))}
          {(!formData.achievements?.hackathons || formData.achievements.hackathons.length === 0) &&
           (!formData.achievements?.certifications || formData.achievements.certifications.length === 0) &&
           (!formData.achievements?.awards || formData.achievements.awards.length === 0) &&
           (!formData.achievements?.competitions || formData.achievements.competitions.length === 0) && (
            <p className="text-gray-500 text-sm">No achievements added yet.</p>
          )}
        </div>
      </div>

      {/* Section 7: Documents */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          Documents
        </h2>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Resume</label>
          {formData.resumeUrl ? (
            <a
              href={(() => {
                // Handle both /uploads/ prefix and /scholarflex/ or /students/ paths (which need /uploads/ prepended)
                let filePath = formData.resumeUrl;
                if (formData.resumeUrl.startsWith('/scholarflex/') || formData.resumeUrl.startsWith('/students/')) {
                  filePath = `/uploads${formData.resumeUrl}`;
                } else if (!formData.resumeUrl.startsWith('/uploads/')) {
                  filePath = `/uploads${formData.resumeUrl}`;
                }
                const baseUrl = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api').replace('/api', '')
                return `${baseUrl}${filePath}`
              })()}
              target="_blank"
              rel="noopener noreferrer"
              className="text-green-600 hover:text-green-800 underline flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              View Resume (PDF)
            </a>
          ) : (
            <p className="text-gray-500 text-sm">No resume uploaded yet.</p>
          )}
        </div>
      </div>
    </div>
  )
}

