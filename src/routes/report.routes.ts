import { Router } from 'express';
import { zodValidator } from '../middlewares/zodReqValidate.middleware.js';
import { authenticate, authorize } from '../middlewares/auth.middleware.js';
import { MiddlewareType, RouteType } from '../types/router.types.js';
import { catchAsync } from '../middlewares/errorHandler.middleware.js';
import { getReportsSchema, getStudentReportSchema } from '../zodSchemas/report.schema.js';
import { getCategoryReport, getReports } from '../controllers/report.controller.js';
import { getStudentReport } from '../controllers/studentReport.controller.js';

/**
 * @swagger
 * /api/reports:
 *   get:
 *     tags:
 *       - Reports
 *     summary: Get comprehensive reports
 *     description: Returns counts, graphs, and recent items for dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Successful response with report data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ReportResponse'
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     StudentReport:
 *       type: object
 *       properties:
 *         counts:
 *           type: object
 *           properties:
 *             enrolledCourses:
 *               type: integer
 *             completedCourses:
 *               type: integer
 *             assignmentSubmissions:
 *               type: integer
 *             comments:
 *               type: integer
 *             registeredDate:
 *               type: integer
 *         courses:
 *           type: array
 *           items:
 *             type: object
 *         recents:
 *           type: object
 *           properties:
 *             assignmentSubmissions:
 *               type: array
 *               items:
 *                 type: object
 *             recentComments:
 *               type: array
 *               items:
 *                 type: object
 */

/**
 * @swagger
 * /api/reports/student:
 *   get:
 *     summary: Get student's comprehensive report
 *     tags:
 *       - Reports
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *         description: "Limit the number of recent items (default: 5)"
 *     responses:
 *       200:
 *         description: Successfully retrieved student report
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/StudentReport'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

const reportRouter = Router()
  .use(authenticate as MiddlewareType)
  .get(
    '/',
    authorize(['admin_only']) as any,
    zodValidator(getReportsSchema),
    catchAsync(getReports as RouteType),
  )
  .get('/student', zodValidator(getStudentReportSchema), catchAsync(getStudentReport as RouteType))
  .get('/category', zodValidator(getReportsSchema), catchAsync(getCategoryReport as RouteType));

export default reportRouter;
