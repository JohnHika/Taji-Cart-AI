import { createElement, useCallback, useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import CriteriaGateModal from '../components/CriteriaGateModal';
import { setUserDetails } from '../store/userSlice';
import { evaluateCriteria } from '../utils/criteriaGates';
import fetchUserDetails from '../utils/fetchUserDetails';

const useCriteriaGate = () => {
  const user = useSelector((state) => state.user);
  const dispatch = useDispatch();
  const [activeGate, setActiveGate] = useState(null);

  const refreshUser = useCallback(async () => {
    const response = await fetchUserDetails();

    if (response?.success && response?.data) {
      dispatch(setUserDetails(response.data));
    }

    return response;
  }, [dispatch]);

  const ensureCriteria = useCallback(async (taskKey) => {
    const evaluation = evaluateCriteria(user, taskKey);

    if (evaluation.allowed) {
      return true;
    }

    setActiveGate({ taskKey, evaluation });
    return false;
  }, [user]);

  useEffect(() => {
    if (!activeGate) {
      return;
    }

    const nextEvaluation = evaluateCriteria(user, activeGate.taskKey);
    const currentKeys = (activeGate.evaluation?.requirements || []).map((requirement) => requirement.key).join('|');
    const nextKeys = (nextEvaluation.requirements || []).map((requirement) => requirement.key).join('|');

    if (nextEvaluation.allowed) {
      setActiveGate(null);
      return;
    }

    if (activeGate.evaluation?.allowed === nextEvaluation.allowed && currentKeys === nextKeys) {
      return;
    }

    setActiveGate((current) => {
      if (!current || current.taskKey !== activeGate.taskKey) {
        return current;
      }

      return {
        ...current,
        evaluation: nextEvaluation,
      };
    });
  }, [activeGate, user]);

  const gateModal = useMemo(() => {
    if (!activeGate) {
      return null;
    }

    return (
      createElement(CriteriaGateModal, {
        isOpen: Boolean(activeGate),
        evaluation: activeGate.evaluation,
        onClose: () => setActiveGate(null),
        onRefreshUser: refreshUser,
      })
    );
  }, [activeGate, refreshUser]);

  return {
    ensureCriteria,
    refreshUser,
    gateModal,
  };
};

export default useCriteriaGate;
