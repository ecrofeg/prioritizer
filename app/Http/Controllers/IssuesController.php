<?php

namespace App\Http\Controllers;

use Carbon\Carbon;
use Illuminate\Support\Facades\Input;
use Illuminate\Support\Facades\Redis;

class IssuesController extends Controller {
	
	const BUGS_DAY_INDEX = '3';
	const DEADLINE_FOR_PLAN_ID = 25;
	const BUG_TRACKER_ID = 1;
	const IN_PROGRESS_STATUS_ID = 2;
	const NEED_COMMENTS_STATUS_ID = 4;
	
	/**
	 * @var bool
	 */
	protected $isBugsDay = false;
	
	/**
	 * @var array
	 */
	protected $prioritiesWeight = [
		'3' => 0, // низкий
		'4' => 10, // средний
		'5' => 20, // высокий
		'6' => 100, // критический
		'7' => 200, // блокер
	];
	
	public function __construct() {
		parent::__construct();
		
		$this->isBugsDay = date('N') === static::BUGS_DAY_INDEX;
	}
	
	/**
	 * @param string $userId
	 *
	 * @return array
	 * @throws \Exception
	 */
	public function index(string $userId = 'me') {
		$forceUpdate = Input::get('forceUpdate', false);
		$redisIssuesKey = 'issues:user:' . $userId;
		$redisUserKey = 'user:' . $userId;
		$issues = Redis::get($redisIssuesKey);
		$user = Redis::get($redisUserKey);
		
		if ($user && !$forceUpdate) {
			$user = json_decode($user);
		}
		else {
			$user = $this->getUserInfo($userId === 'me' ? 'current' : $userId);
			
			Redis::set($redisUserKey, json_encode($user));
			Redis::expire($redisUserKey, 300);
		}
		
		if ($issues && !$forceUpdate) {
			$issues = json_decode($issues);
		}
		else {
			$issues = $this->getIssuesForUser($userId);
			$issues = array_map(function ($issue) {
				return $this->parseIssue($issue);
			}, $issues);
			
			Redis::set($redisIssuesKey, json_encode($issues));
			Redis::expire($redisIssuesKey, 300);
		}
		
		usort($issues, function ($a, $b) {
			return $this->getPriorityForIssue($b) <=> $this->getPriorityForIssue($a);
		});
		
		return [
			'issues' => $issues,
			'user'   => $user,
		];
	}
	
	/**
	 * @param \stdClass $issue
	 *
	 * @return \stdClass
	 */
	protected function parseIssue(\stdClass $issue): \stdClass {
		$issue->inProgress = $issue->status->id === static::IN_PROGRESS_STATUS_ID;
		$issue->isBug = $issue->tracker->id === static::BUG_TRACKER_ID;
		$issue->needComment = $issue->status->id === static::NEED_COMMENTS_STATUS_ID;
		
		return $issue;
	}
	
	/**
	 * @param \stdClass $issue
	 *
	 * @return int
	 */
	protected function getPriorityForIssue(\stdClass $issue): int {
		$result = $this->prioritiesWeight[$issue->priority->id];
		$deadlineForIssue = $this->issueIsInPlan($issue);

		switch ($issue->status->id) {
			// Если задача со статусом "Требует комментария", то повышаем приоритет.
			// Такие задачи должны разбираться постоянно, и если задача занимает
			// больше 5-10 минут, то надо сменить ей статус на другой.
			case static::NEED_COMMENTS_STATUS_ID:
				$result += 30;
				break;

			// Задачи "В разработке" всегда отображаем сверху.
			case static::IN_PROGRESS_STATUS_ID:
				$result += 100;
				break;
		}
		
		if ($deadlineForIssue) {
			// Если задача плановая и сегодня не среда, то повышаем ее приоритет.
			// Если сегодня среда, то понижаем приоритет.
			$result += $this->isBugsDay ? -15 : 15;
			
			// Парсим дедлайн для плановой задачи.
			$deadlineDate = Carbon::parse($deadlineForIssue);
			$daysLeft = Carbon::now()->diffInDays($deadlineDate, false);
			
			if ($daysLeft <= 0) {
				// Если дедлайн просрочен, то резко повышаем приоритет задачи.
				$result += 15;
			}
			else {
				// Если дедлайн не просрочен, то пропорционально повышаем приоритет.
				$result += -($daysLeft * 0.5);
			}
		}
		else {
			// Если задача из текучки (вне плана) и сегодня среда, то повышаем ее приоритет.
			$result += $this->isBugsDay ? 15 : -15;
		}
		
		$issue->rating = $result;
		
		return $result;
	}
	
	/**
	 * @param \stdClass $issue
	 *
	 * @return string
	 */
	protected function issueIsInPlan(\stdClass $issue): string {
		$result = '';
		
		if (isset($issue->custom_fields)) {
			foreach ($issue->custom_fields as $field) {
				if ($field->id === static::DEADLINE_FOR_PLAN_ID && $field->value) {
					$result = $field->value;
					false;
				}
			}
		}
		
		return $result;
	}
	
	/**
	 * @param string $userId
	 *
	 * @return \stdClass
	 * @throws \Exception
	 */
	protected function getUserInfo(string $userId): \stdClass {
		$response = $this->makeRedmineRequest('users/' . $userId);
		
		if (!isset($response->user)) {
			throw new \Exception('User not found');
		}
		
		return $response->user;
	}
	
	/**
	 * @param string $userId
	 *
	 * @return array
	 * @throws \Exception
	 */
	protected function getIssuesForUser(string $userId): array {
		$limit = 100;
		$offset = 0;

		$response = $this->getIssues($userId, $limit, $offset);
		$issues = $response->issues;

		$totalCount = (int) $response->total_count;
		$iterations = ceil($totalCount / $limit);
		
		for ($i = 1; $i < $iterations; $i++) {
			$offset = $i * 100;
			$response = $this->getIssues($userId, $limit, $offset);
			$issues = array_merge($issues, $response->issues);
		}
		
		return $issues;
	}

	/**
	 * @param int $userId
	 * @param int $limit
	 * @param int $offset
	 * 
	 * @return \stdClass
	 */
	protected function getIssues($userId, $limit, $offset): \stdClass {
		return $this->makeRedmineRequest('issues', [
			'assigned_to_id' => $userId ? $userId : 'current',
			'limit'          => $limit,
			'offset'         => $offset,
		]);
	}
}
