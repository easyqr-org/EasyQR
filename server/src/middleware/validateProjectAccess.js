const { AppError } = require("../errors");

function validateProjectAccess(req, projectId) {
  const authProjectId = req.authProjectId || null;
  if (!authProjectId) {
    throw new AppError({
      statusCode: 401,
      code: "PROJECT_AUTH_REQUIRED",
      message: "Project authentication is required",
    });
  }

  if (String(authProjectId) !== String(projectId)) {
    throw new AppError({
      statusCode: 403,
      code: "CROSS_PROJECT_ACCESS_DENIED",
      message: "Cross-project access is not allowed",
    });
  }
}

module.exports = { validateProjectAccess };
